// @vitest-environment node
import type { ImageSize } from 'payload'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { Photos } from '@/collections/Photos'

const upload = Photos.upload as Exclude<typeof Photos.upload, boolean | undefined>
const sizes = (upload.imageSizes ?? []) as ImageSize[]
const sizeByName = Object.fromEntries(sizes.map((s) => [s.name, s]))

describe('Photos upload config', () => {
  it('accepts AVIF / HEIC / HEIF (and common raster formats) as input', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']) {
      expect(upload.mimeTypes).toContain(type)
    }
    // SVG stays out — rasterizing untrusted SVG is a security risk.
    expect(upload.mimeTypes).not.toContain('image/svg+xml')
  })

  it('sets neither top-level resizeOptions nor formatOptions, so the stored original stays pristine', () => {
    // Both apply to the *original*, not the imageSizes ladder; either one present makes
    // Payload re-run the upload through sharp (re-encode + EXIF strip). Sparse renditions
    // are already Payload's per-size default.
    expect(upload.resizeOptions).toBeUndefined()
    expect(upload.formatOptions).toBeUndefined()
  })

  it('converts every aspect-preserving rendition to WebP', () => {
    for (const name of ['thumbnail', 'small', 'medium', 'large', 'xlarge']) {
      expect(sizeByName[name]?.formatOptions?.format, name).toBe('webp')
    }
  })

  it('keeps the social/OG card as JPEG for maximum unfurler compatibility', () => {
    expect(sizeByName.og?.formatOptions?.format).toBe('jpeg')
  })
})

describe('sharp binary capability', () => {
  it('decodes AVIF input and re-encodes to WebP (guards the container build)', async () => {
    expect(sharp.format.heif?.input?.buffer).toBe(true)

    const avif = await sharp({
      create: { width: 64, height: 48, channels: 3, background: { r: 10, g: 90, b: 160 } },
    })
      .avif({ quality: 50 })
      .toBuffer()

    const webp = await sharp(avif, { animated: true })
      .rotate()
      .resize({ width: 32, withoutEnlargement: true })
      .toFormat('webp', { quality: 70 })
      .toBuffer()

    const meta = await sharp(webp).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(32)
  })
})
