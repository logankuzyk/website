// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { Assets } from '@/collections/Assets'
import { validateSvgDimensions } from '@/collections/Assets/hooks/validateSvgDimensions'
import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'

const upload = Assets.upload as Exclude<typeof Assets.upload, boolean | undefined>

describe('Assets collection', () => {
  it('accepts SVG only', () => {
    expect(upload.mimeTypes).toEqual(['image/svg+xml'])
  })

  it('is publicly readable and writable only when authenticated', () => {
    expect(Assets.access?.read).toBe(anyone)
    expect(Assets.access?.create).toBe(authenticated)
    expect(Assets.access?.update).toBe(authenticated)
    expect(Assets.access?.delete).toBe(authenticated)
  })

  it('rejects dimensionless SVGs before processing', () => {
    expect(Assets.hooks?.beforeOperation).toContain(validateSvgDimensions)
  })

  it('does not rasterise or resize the SVG', () => {
    expect(upload.imageSizes).toBeUndefined()
    expect(upload.resizeOptions).toBeUndefined()
    expect(upload.formatOptions).toBeUndefined()
  })

  it('has no alt field', () => {
    expect(Assets.fields.some((f) => 'name' in f && f.name === 'alt')).toBe(false)
  })
})

describe('s3Storage registration', () => {
  it('registers assets and photos with their own prefixes, bypassing Payload access control', async () => {
    const { storageCollections } = await import('@/plugins')
    expect(storageCollections.assets).toMatchObject({
      prefix: 'assets',
      disablePayloadAccessControl: true,
    })
    expect(storageCollections.photos).toMatchObject({ prefix: 'photos' })
  })
})
