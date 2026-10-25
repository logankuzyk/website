/**
 * One-off migration: Projects `technologies[].technology` -> `tags` (text, hasMany).
 *
 * Touches every project *and every stored version* (`_projects_versions`), then unsets
 * `technologies`. Writes through the raw Mongo driver, so it works whether or not the old
 * field is still in the Payload config. Idempotent: re-running merges into existing `tags`.
 * Run it on a copy of the database first.
 *
 * Usage: npm run migrate:project-tags [-- --dry-run]
 */
import 'dotenv/config'
import { pathToFileURL } from 'url'

type Source = {
  tags?: unknown
  technologies?: unknown
}

export type TagsUpdate = {
  $set: Record<string, string[]>
  $unset: Record<string, ''>
}

const toStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : []

/**
 * Build the Mongo update for one document (or, with `prefix: 'version.'`, one version
 * snapshot). Returns null when there is no `technologies` to migrate.
 */
export const buildTagsUpdate = (source: Source, prefix = ''): TagsUpdate | null => {
  if (!Array.isArray(source.technologies)) return null

  const migrated = toStrings(
    source.technologies.map((entry) => (entry as { technology?: unknown } | null)?.technology),
  ).map((v) => v.trim())

  const tags = [...new Set([...toStrings(source.tags), ...migrated])]

  return {
    $set: { [`${prefix}tags`]: tags },
    $unset: { [`${prefix}technologies`]: '' },
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  const projects = payload.db.collections['projects']
  const versions = payload.db.versions['projects']

  const targets: { label: string; model: typeof projects; prefix: string; field: (d: any) => Source }[] = [
    { label: 'projects', model: projects, prefix: '', field: (d: Source) => d },
    {
      label: '_projects_versions',
      model: versions,
      prefix: 'version.',
      field: (d: { version?: Source }) => d.version ?? {},
    },
  ]

  for (const { label, model, prefix, field } of targets) {
    let migrated = 0
    // The raw driver collection: the Mongoose model's schema no longer has `technologies`, and
    // Mongoose would strip it from the filter and the update.
    const raw = model.collection
    for await (const doc of raw.find({ [`${prefix}technologies`]: { $exists: true } })) {
      const update = buildTagsUpdate(field(doc), prefix)
      if (!update) continue
      if (!dryRun) await raw.updateOne({ _id: doc._id }, update)
      migrated++
    }
    payload.logger.info(`${label}: ${dryRun ? 'would migrate' : 'migrated'} ${migrated} document(s)`)
  }

  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
