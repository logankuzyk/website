/**
 * Backfill script: write AI-generated alt text for existing Photos that have none (see
 * src/collections/Photos/altText). New uploads get theirs during the upload itself; this
 * covers everything uploaded before that existed, or while Workers AI was not configured.
 *
 * Each photo is one request to Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`),
 * so it needs CLOUDFLARE_ACCOUNT_ID and WORKERS_AI_API_TOKEN (see .env.example).
 *
 * Runs standalone (outside Next.js), same pattern as scripts/reprocess-photos.ts.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * WHAT IT WILL AND WON'T TOUCH
 *
 * - Default: only photos whose `alt` is blank (missing, null or '').
 * - `--regenerate`: also photos whose `altSource` is 'ai', replacing text an earlier run (or
 *   the upload hook) generated.
 * - Never hand-written text. `generatePhotoAltText` re-reads each photo right before the
 *   model call and skips it if it has since been given alt text it may not replace, so text
 *   typed in the admin while this runs is safe.
 *
 * Only `alt` and `altSource` are written; no file is uploaded and `sizes.*` is not rebuilt.
 *
 * The run STOPS on the first failure (pass `--continue-on-error` to override): a bad token
 * or an exhausted quota fails every photo the same way, and there is no point finding that
 * out several hundred requests later.
 *
 * COST: every generated alt text is a billed model call. Cloudflare's model page lists
 * $0.10 per million input tokens and $0.30 per million output tokens (about $0.00003 a photo); `--dry-run` shows how
 * many photos a run would send, and `--limit` lets you try a handful and read the real usage
 * off the Workers AI dashboard before committing to the lot.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npm run generate:alt-text -- --dry-run             # list what would be processed, call nothing
 *   npm run generate:alt-text -- --limit 25            # process at most 25 photos, then stop
 *   npm run generate:alt-text -- --regenerate          # also redo AI-written alt text
 *   npm run generate:alt-text -- --continue-on-error   # don't stop on the first failed photo
 *   npm run generate:alt-text                          # process every photo with blank alt text
 */
import 'dotenv/config'
import { createLocalReq, getPayload, type Where } from 'payload'
import config from '../src/payload.config'
import { generatePhotoAltText } from '../src/collections/Photos/altText/generate'
import { ALT_TEXT_MODEL, isAltTextConfigured } from '../src/collections/Photos/altText/workersAI'

const FLAGS = ['--dry-run', '--regenerate', '--continue-on-error', '--limit']

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const REGENERATE = args.includes('--regenerate')
const CONTINUE_ON_ERROR = args.includes('--continue-on-error')
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity
const DELAY_MS = 500 // be polite: one model call per photo, strictly one at a time

const sleep = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis))

// A mistyped `--dry-run` must not turn into a real, billed run.
const unknown = args.filter(
  (arg, index) => !FLAGS.includes(arg) && !(limitArg >= 0 && index === limitArg + 1),
)
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}\nKnown flags: ${FLAGS.join(' ')}`)
  process.exit(1)
}
if (limitArg >= 0 && !(Number.isInteger(LIMIT) && LIMIT > 0)) {
  console.error('--limit needs a positive whole number, e.g. --limit 25')
  process.exit(1)
}

/**
 * Photos this run may write to.
 *
 * `exists: false` is the clause doing the work: for a text field the Mongo adapter expands
 * it to "missing OR null OR ''", which are the three ways a blank `alt` is stored (never set,
 * cleared through the API, cleared in the admin form). The explicit `equals: ''` is redundant
 * with it today and only there so an adapter change can't silently drop the empty-string case.
 *
 * Not matched: an `alt` of nothing but whitespace. No query operator expresses that, and it
 * takes someone typing only spaces into the field to create one.
 */
const candidatesWhere: Where = {
  or: [
    { alt: { exists: false } },
    { alt: { equals: '' } },
    ...(REGENERATE ? [{ altSource: { equals: 'ai' } }] : []),
  ],
}

async function main() {
  if (!DRY_RUN && !isAltTextConfigured()) {
    console.error(
      'Workers AI is not configured: set CLOUDFLARE_ACCOUNT_ID and WORKERS_AI_API_TOKEN ' +
        '(see .env.example).\nNothing was changed. Use --dry-run to list the photos without them.',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })

  // Collect every candidate before the first write. Paging through this query while filling
  // in `alt` would shrink the result set under the cursor and skip photos.
  const { docs: candidates } = await payload.find({
    collection: 'photos',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    select: { alt: true, altSource: true, filename: true },
    sort: 'createdAt',
    where: candidatesWhere,
  })
  const batch = candidates.slice(0, LIMIT)

  console.log(
    `${candidates.length} photo(s) ${REGENERATE ? 'with blank or AI-written' : 'with blank'} alt text` +
      (batch.length < candidates.length ? `, taking the first ${batch.length} (--limit)` : '') +
      (DRY_RUN ? '' : `. Model: ${ALT_TEXT_MODEL}`),
  )

  const label = (photo: (typeof batch)[number]) =>
    `${photo.id} ${photo.filename ?? '(no filename)'}`

  if (DRY_RUN) {
    for (const photo of batch) {
      const current = photo.alt?.trim()
      console.log(
        current
          ? `would regenerate: ${label(photo)} (currently ${JSON.stringify(current)})`
          : `would generate: ${label(photo)}`,
      )
    }
    if (!isAltTextConfigured()) {
      console.log(
        '\nNote: CLOUDFLARE_ACCOUNT_ID / WORKERS_AI_API_TOKEN are not set, so a real run would refuse to start.',
      )
    }
    console.log(`\nDone. (dry run) would process=${batch.length}`)
    process.exit(0)
  }

  const { docs: users } = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
  })
  if (!users[0]) throw new Error('no admin user found to attribute the alt text writes to')
  const req = await createLocalReq({ user: users[0] }, payload)

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const photo of batch) {
    try {
      const result = await generatePhotoAltText({
        id: photo.id,
        // 'ai' still fills blanks, and still refuses hand-written text.
        overwrite: REGENERATE ? 'ai' : 'empty',
        // Skip the `revalidatePhoto` afterChange hook: `revalidateTag()` throws outside a Next.js
        // request. The hook catches that now, so without this flag each photo would just log two
        // warnings, but a throw there is what once skipped the R2 upload hook for a whole
        // backfill (see scripts/reprocess-photos.ts), so scripts opt out explicitly.
        // Consequence: this script does NOT refresh the photos sitemap or the new-tab manifest
        // caches. They pick the new text up on the next photo change made in the admin, or, for
        // the manifest, its 24h backstop.
        context: { disableRevalidate: true },
        req,
      })

      if (result.status === 'generated') {
        generated++
        console.log(`${label(photo)} -> ${JSON.stringify(result.alt)}`)
      } else {
        // Deleted, or given alt text by someone else, since the candidates were collected.
        skipped++
        console.log(`skipped (${result.reason}): ${label(photo)}`)
      }
    } catch (err) {
      failed++
      console.error(`FAILED ${label(photo)}:`, err instanceof Error ? err.message : err)
      if (!CONTINUE_ON_ERROR) {
        console.error('\nStopping on first failure (pass --continue-on-error to override).')
        break
      }
    }

    await sleep(DELAY_MS)
  }

  const remaining = candidates.length - generated - skipped - failed
  console.log(
    `\nDone. generated=${generated} skipped=${skipped} failed=${failed}` +
      (remaining > 0 ? ` remaining=${remaining}` : ''),
  )
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('generate-alt-text failed:', err)
  process.exit(1)
})
