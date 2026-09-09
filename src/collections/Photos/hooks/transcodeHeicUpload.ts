import type { CollectionBeforeOperationHook } from 'payload'

import { ValidationError } from 'payload'
import sharp from 'sharp'

const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

// HEIF brands that mean "HEVC-coded" (i.e. a real Apple .heic), not AVIF.
const HEIC_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'])

/** Read the `ftyp` box (major brand + compatible brands) and decide if this is HEVC-in-HEIF. */
export const looksLikeHeic = (buf: Buffer): boolean => {
  if (buf.length < 16 || buf.toString('latin1', 4, 8) !== 'ftyp') return false
  const boxSize = Math.min(buf.readUInt32BE(0) || buf.length, buf.length)
  const brands = new Set<string>()
  for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
    brands.add(buf.toString('latin1', offset, offset + 4).trim())
  }
  if (brands.has('avif') || brands.has('avis')) return false
  for (const brand of brands) if (HEIC_BRANDS.has(brand)) return true
  return false
}

/**
 * Apple HEIC / HEIF uploads: transcode to JPEG *before* Payload's `generateFileData` runs,
 * so the photo flows through the normal WebP rendition pipeline. Payload's `canResizeImage`
 * excludes `image/heic` / `image/heif`, so without this the file would be stored raw with
 * no `sizes.*` and nothing a browser can display.
 *
 * Trade-off: the archival "original" becomes this JPEG, not the source HEIC. Quality is
 * kept high (mozjpeg q92) to minimise the loss.
 *
 * Requires a `sharp` with an HEVC decoder (libde265) — the Docker image's system libvips
 * (see Dockerfile). Runs on `create` only; the reprocess script re-uploads the stored JPEG.
 */
export const transcodeHeicUpload: CollectionBeforeOperationHook = async ({ operation, req }) => {
  if (operation !== 'create' || !req.file?.data?.length) return

  const { data, mimetype, name } = req.file
  if (!HEIC_MIME_TYPES.has(mimetype.toLowerCase()) && !looksLikeHeic(data)) return

  let jpeg: Buffer
  try {
    jpeg = await sharp(data).rotate().jpeg({ quality: 92, mozjpeg: true }).toBuffer()
  } catch (err) {
    req.payload.logger.error(`transcodeHeicUpload: ${err instanceof Error ? err.message : err}`)
    throw new ValidationError({
      errors: [
        {
          message:
            "This HEIC image couldn't be read. Export it as JPEG from your photo app and upload that instead.",
          path: 'file',
        },
      ],
    })
  }

  req.file.data = jpeg
  req.file.size = jpeg.length
  req.file.mimetype = 'image/jpeg'
  req.file.name = /\.(heic|heif)$/i.test(name) ? name.replace(/\.(heic|heif)$/i, '.jpg') : `${name}.jpg`
}
