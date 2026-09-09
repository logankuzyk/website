// @vitest-environment node
import type { ImageSize } from 'payload'

import { FileUploadError, NotFound } from 'payload'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { Photos } from '@/collections/Photos'
import { looksLikeHeic, transcodeHeicUpload } from '@/collections/Photos/hooks/transcodeHeicUpload'
import { fileUploadErrorResponse } from '@/hooks/fileUploadErrorResponse'
import { decodeProbeFixtures, probeImageDecoders } from '@/utilities/imageDecodeProbe'

const upload = Photos.upload as Exclude<typeof Photos.upload, boolean | undefined>
const sizes = (upload.imageSizes ?? []) as ImageSize[]
const sizeByName = Object.fromEntries(sizes.map((s) => [s.name, s]))
const ftyp = (buf: Buffer) => buf.toString('latin1', 4, 12)

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

  it('transcodes HEIC/HEIF uploads before Payload processes them', () => {
    expect(upload.mimeTypes).toEqual(expect.arrayContaining(['image/heic', 'image/heif']))
    expect(Photos.hooks?.beforeOperation).toContain(transcodeHeicUpload)
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

  // The real 10-bit-AVIF / HEIC decode check runs in the `media` CI job against the built
  // Docker image (system libvips). npm-installed sharp on the CI runner / a dev Mac can't
  // decode these, so here we only assert the probe is well-formed and the fixtures are real.
  it('ships valid 10-bit AVIF and HEIC probe fixtures', () => {
    expect(ftyp(decodeProbeFixtures['AVIF (10-bit)'])).toBe('ftypavif')
    expect(ftyp(decodeProbeFixtures.HEIC)).toBe('ftypheic')
  })

  it('probeImageDecoders returns one well-formed result per fixture and never throws', async () => {
    const results = await probeImageDecoders()
    expect(results.map((r) => r.format).sort()).toEqual(['AVIF (10-bit)', 'HEIC'])
    for (const r of results) {
      expect(typeof r.ok).toBe('boolean')
      if (!r.ok) expect(r.error).toBeTruthy()
    }
  })
})

describe('looksLikeHeic', () => {
  it('is true for a real HEIC and false for AVIF / JPEG / junk', async () => {
    expect(looksLikeHeic(decodeProbeFixtures.HEIC)).toBe(true)
    expect(looksLikeHeic(decodeProbeFixtures['AVIF (10-bit)'])).toBe(false)
    const jpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } })
      .jpeg()
      .toBuffer()
    expect(looksLikeHeic(jpeg)).toBe(false)
    expect(looksLikeHeic(Buffer.alloc(8))).toBe(false)
  })
})

describe('fileUploadErrorResponse', () => {
  it('re-shapes a FileUploadError into a field-level error the BulkUpload UI counts', async () => {
    const result = await fileUploadErrorResponse({ error: new FileUploadError() } as never)
    expect(result?.status).toBe(400)
    const errors = result?.response?.errors as { data?: { errors?: { path?: string }[] } }[] | undefined
    expect(errors?.[0]?.data?.errors?.[0]?.path).toBe('file')
  })

  it('ignores any other error', async () => {
    expect(await fileUploadErrorResponse({ error: new NotFound() } as never)).toBeUndefined()
  })
})
