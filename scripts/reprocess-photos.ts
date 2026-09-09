/**
 * Backfill script: regenerate the derivative image sizes for existing Photos so they pick up
 * the WebP conversion pipeline (see src/collections/Photos.ts).
 *
 * The pristine original is re-uploaded unchanged; only `sizes.*` are rebuilt by Payload.
 *
 * Runs standalone (outside Next.js), same pattern as scripts/seed.ts.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * WHY THIS SCRIPT IS FUSSY (hard-won from a botched prod run — see PR):
 *
 * 1. `context.disableRevalidate` is REQUIRED.
 *    The Photos collection's `afterChange` hook (`revalidatePhoto`) calls `revalidateTag()`
 *    from `next/cache`, which throws `Invariant: static generation store missing` when it
 *    runs outside a Next.js request. `@payloadcms/plugin-cloud-storage` registers its S3
 *    upload as an `afterChange` hook too, appended AFTER the collection's own hooks — so if
 *    `revalidatePhoto` throws, the upload hook never runs. The document (with its new
 *    `sizes.*` metadata) still gets written to Mongo, but NOTHING is uploaded to the bucket,
 *    leaving every reprocessed photo pointing at objects that don't exist. Passing
 *    `context: { disableRevalidate: true }` skips the revalidate and lets the upload run.
 *
 * 2. `overwriteExistingFiles: true` is REQUIRED.
 *    Without it, Payload's `getSafeFileName` sees the doc's own still-present original in the
 *    bucket, decides the name is taken, and appends `-1` (`IMG_1234.jpg` -> `IMG_1234-1.jpg`).
 *    That renames the canonical file and orphans the real objects. `overwriteExistingFiles`
 *    keeps the filename and overwrites the same keys in place.
 *
 * 3. Every write is VERIFIED against the public URL before moving on, and the run STOPS on
 *    the first failure (pass `--continue-on-error` to override). A silent storage failure
 *    that corrupts one doc is a bug; churning through all of them is a disaster.
 *
 * Test end-to-end against the local MinIO mock (`npm run dev:r2`, then point the storage env
 * at it) and confirm bucket object counts before running against real R2.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npm run reprocess:photos -- --dry-run             # list what would change, touch nothing
 *   npm run reprocess:photos -- --limit 25            # process at most 25 photos, then stop
 *   npm run reprocess:photos -- --force               # reprocess even if sizes already look converted
 *   npm run reprocess:photos -- --continue-on-error   # don't stop on the first failed photo
 *   npm run reprocess:photos                          # process all not-yet-converted photos
 */
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_MEDIA_DIR = path.resolve(dirname, '../public/photos')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const CONTINUE_ON_ERROR = args.includes('--continue-on-error')
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity
const DELAY_MS = 250 // be gentle: AVIF/HEIC decode is CPU-heavy

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A photo whose every generated size is already .webp (or .jpg for `og`) is considered done. */
const alreadyConverted = (sizes: Record<string, { filename?: string | null } | undefined> | null | undefined) => {
  if (!sizes) return false
  const entries = Object.entries(sizes).filter(([, v]) => v?.filename)
  if (entries.length === 0) return false
  return entries.every(([name, v]) => {
    const f = v!.filename!.toLowerCase()
    return name === 'og' ? f.endsWith('.jpg') || f.endsWith('.jpeg') : f.endsWith('.webp')
  })
}

async function getOriginalBytes(photo: {
  filename?: string | null
  url?: string | null
}): Promise<Buffer> {
  // Prefer the local file when it exists (dev / disableLocalStorage off)...
  if (photo.filename) {
    const localPath = path.join(LOCAL_MEDIA_DIR, photo.filename)
    try {
      return await fs.readFile(localPath)
    } catch {
      /* fall through to HTTP */
    }
  }
  // ...otherwise pull the original from its public URL (R2 / CDN).
  if (!photo.url) throw new Error('photo has neither a local file nor a url')
  const res = await fetch(toAbsolute(photo.url), { headers: ASSET_HEADERS })
  if (!res.ok) throw new Error(`GET ${photo.url} -> ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const toAbsolute = (url: string) =>
  url.startsWith('http')
    ? url
    : `${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')}${url}`

// A browser-ish UA: a custom domain in front of R2 with bot protection answers bare
// clients (and HEAD) with 403.
const ASSET_HEADERS = { 'User-Agent': 'reprocess-photos/1.0' }

/**
 * Resolve one stored object, tolerating transient errors. A just-written object can briefly
 * 404 at the CDN edge, and the connection to it flakes occasionally — neither means the
 * upload failed, so retry a few times before giving up. Returns an error string, or null on success.
 */
async function objectResolves(url: string, attempts = 4): Promise<string | null> {
  let last = ''
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(500 * 2 ** (i - 1)) // 0.5s, 1s, 2s
    try {
      // Ranged GET, not HEAD: the CDN rejects HEAD but answers a range request with 206.
      const res = await fetch(toAbsolute(url), { headers: { ...ASSET_HEADERS, Range: 'bytes=0-0' } })
      if (res.status === 200 || res.status === 206) return null
      last = `HTTP ${res.status}`
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
    }
  }
  return last
}

/** Confirm the reprocessed doc's original + every size actually resolve from storage. */
async function verifyStored(photo: {
  url?: string | null
  sizes?: Record<string, { url?: string | null } | undefined> | null
}): Promise<void> {
  const urls = [
    photo.url,
    ...Object.values(photo.sizes ?? {}).map((s) => s?.url),
  ].filter((u): u is string => typeof u === 'string' && u.length > 0)

  const missing: string[] = []
  for (const url of urls) {
    const err = await objectResolves(url)
    if (err) missing.push(`${url} -> ${err}`)
  }

  if (missing.length) {
    throw new Error(
      `${missing.length}/${urls.length} objects did not upload:\n    ${missing.join('\n    ')}`,
    )
  }
}

async function main() {
  const payload = await getPayload({ config })

  const { docs: users } = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
  if (!users[0]) throw new Error('no admin user found to attribute the reprocess to')
  const req = await createLocalReq({ user: users[0] }, payload)

  let page = 1
  let processed = 0
  let skipped = 0
  let failed = 0

  outer: for (;;) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'photos',
      depth: 0,
      limit: 50,
      page,
      overrideAccess: true,
      sort: 'createdAt',
    })

    for (const photo of docs) {
      if (processed >= LIMIT) break

      const label = `${photo.id} ${photo.filename ?? '(no filename)'}`

      if (!FORCE && alreadyConverted(photo.sizes as never)) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`would reprocess: ${label}`)
        processed++
        continue
      }

      try {
        const data = await getOriginalBytes(photo)
        await payload.update({
          collection: 'photos',
          id: photo.id,
          data: {},
          file: {
            data,
            name: photo.filename ?? `${photo.id}.bin`,
            mimetype: photo.mimeType ?? 'application/octet-stream',
            size: data.byteLength,
          },
          // Skip revalidateTag() — it throws outside Next and would abort the S3 upload hook.
          context: { disableRevalidate: true },
          // Keep the filename; overwrite the same bucket keys instead of getting a "-1" suffix.
          overwriteExistingFiles: true,
          overrideAccess: true,
          req,
        })

        const fresh = await payload.findByID({ collection: 'photos', id: photo.id, depth: 0 })
        await verifyStored(fresh as never)

        processed++
        console.log(`reprocessed: ${label}`)
      } catch (err) {
        failed++
        console.error(`FAILED ${label}:`, err instanceof Error ? err.message : err)
        if (!CONTINUE_ON_ERROR) {
          console.error('\nStopping on first failure (pass --continue-on-error to override).')
          break outer
        }
      }

      await sleep(DELAY_MS)
    }

    if (processed >= LIMIT || !hasNextPage) break
    page++
  }

  console.log(
    `\nDone. ${DRY_RUN ? '(dry run) ' : ''}processed=${processed} skipped=${skipped} failed=${failed}`,
  )
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('reprocess-photos failed:', err)
  process.exit(1)
})
