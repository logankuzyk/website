/**
 * Backfill script: regenerate the derivative image sizes for existing Photos so they pick up
 * the WebP conversion pipeline (see src/collections/Photos.ts).
 *
 * The pristine original is re-uploaded unchanged; only `sizes.*` are rebuilt by Payload.
 *
 * Runs standalone (outside Next.js), same pattern as scripts/seed.ts.
 *
 * Usage:
 *   npm run reprocess:photos -- --dry-run           # list what would change, touch nothing
 *   npm run reprocess:photos -- --limit 25          # process at most 25 photos
 *   npm run reprocess:photos -- --force             # reprocess even if sizes already look converted
 *   npm run reprocess:photos                        # process all not-yet-converted photos
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
  const absolute = photo.url.startsWith('http')
    ? photo.url
    : `${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')}${photo.url}`
  const res = await fetch(absolute)
  if (!res.ok) throw new Error(`GET ${absolute} -> ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
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

  for (;;) {
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
          overrideAccess: true,
          req,
        })
        processed++
        console.log(`reprocessed: ${label}`)
      } catch (err) {
        failed++
        console.error(`FAILED ${label}:`, err instanceof Error ? err.message : err)
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
