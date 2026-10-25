// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Projects } from '@/collections/Projects'
import { validateOptionalUrl as validate } from '@/collections/Projects/validateOptionalUrl'
import { buildTagsUpdate } from '../../scripts/migrate-project-tags'

describe('Projects fields', () => {
  const field = (name: string) => Projects.fields.find((f) => 'name' in f && f.name === name)

  it('replaces `technologies` with a hasMany text `tags` field', () => {
    expect(field('technologies')).toBeUndefined()
    expect(field('tags')).toMatchObject({ type: 'text', hasMany: true })
  })

  it('has an optional, URL-validated `repoUrl`', () => {
    const repoUrl = field('repoUrl') as { type: string; required?: boolean; validate?: unknown }
    expect(repoUrl.type).toBe('text')
    expect(repoUrl.required).toBeFalsy()
    expect(repoUrl.validate).toBe(validate)
  })

  it('validates externalUrl, which drives the View live link', () => {
    const externalUrl = field('externalUrl') as { validate?: unknown }
    expect(externalUrl.validate).toBe(validate)
  })

  it('keeps featuredImage required', () => {
    expect(field('featuredImage')).toMatchObject({ required: true })
  })
})

// Only `value` is read; the rest of the validator options are irrelevant here.
const ctx = {} as never
const validateOptionalUrl = (value: string | null | undefined, options: never) =>
  validate(value as string, options)

describe('validateOptionalUrl', () => {
  it('allows empty values', () => {
    expect(validateOptionalUrl(undefined, ctx)).toBe(true)
    expect(validateOptionalUrl(null, ctx)).toBe(true)
    expect(validateOptionalUrl('', ctx)).toBe(true)
  })

  it('allows http(s) URLs', () => {
    expect(validateOptionalUrl('https://github.com/logankuzyk/website', ctx)).toBe(true)
    expect(validateOptionalUrl('http://example.com', ctx)).toBe(true)
  })

  it('rejects non-URLs and non-http schemes', () => {
    expect(validateOptionalUrl('github.com/x', ctx)).toEqual(expect.any(String))
    expect(validateOptionalUrl('javascript:alert(1)', ctx)).toEqual(expect.any(String))
  })
})

describe('buildTagsUpdate', () => {
  it('copies technologies[].technology into tags and unsets technologies', () => {
    expect(
      buildTagsUpdate({ technologies: [{ technology: 'Next.js', id: 'a' }, { technology: 'Payload' }] }),
    ).toEqual({ $set: { tags: ['Next.js', 'Payload'] }, $unset: { technologies: '' } })
  })

  it('addresses version snapshots via a path prefix', () => {
    expect(buildTagsUpdate({ technologies: [{ technology: 'Go' }] }, 'version.')).toEqual({
      $set: { 'version.tags': ['Go'] },
      $unset: { 'version.technologies': '' },
    })
  })

  it('merges with existing tags without duplicates (idempotent re-run)', () => {
    expect(
      buildTagsUpdate({ tags: ['Go'], technologies: [{ technology: 'Go' }, { technology: 'Rust' }] }),
    ).toEqual({ $set: { tags: ['Go', 'Rust'] }, $unset: { technologies: '' } })
  })

  it('unsets an empty technologies array without writing empty tags over existing ones', () => {
    expect(buildTagsUpdate({ tags: ['Go'], technologies: [] })).toEqual({
      $set: { tags: ['Go'] },
      $unset: { technologies: '' },
    })
  })

  it('returns null when there is nothing to migrate', () => {
    expect(buildTagsUpdate({})).toBeNull()
    expect(buildTagsUpdate({ tags: ['Go'] })).toBeNull()
  })

  it('skips blank entries', () => {
    expect(buildTagsUpdate({ technologies: [{ technology: ' ' }, { technology: 'Go' }, {}] })).toEqual({
      $set: { tags: ['Go'] },
      $unset: { technologies: '' },
    })
  })
})
