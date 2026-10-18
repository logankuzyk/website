import type { Payload } from 'payload'

import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import type { Photo } from '@/payload-types'

import { getServerSideURL } from '@/utilities/getURL'

// Smallest rendition that still shows enough detail to describe; larger ones only cost tokens.
// Not every size exists for every photo (small sources skip the bigger renditions).
export const PREFERRED_SIZES = ['medium', 'large', 'small', 'xlarge'] as const

// A custom domain in front of R2 with bot protection answers bare clients with 403.
const ASSET_HEADERS = { 'User-Agent': 'photo-alt-text/1.0' }

/**
 * Re-encode whatever we have (WebP rendition, AVIF/TIFF original, animated GIF…) as a modest
 * JPEG, so the model only ever sees one well-supported format at a predictable size.
 */
export const toModelJpeg = (input: Buffer): Promise<Buffer> =>
  sharp(input)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85 })
    .toBuffer()

type StoredFile = { filename?: string | null; url?: string | null }

/** Read a stored photo from local disk when it is there, otherwise from its public URL. */
export async function loadStoredPhoto(payload: Payload, photo: Photo): Promise<Buffer> {
  const candidates: StoredFile[] = [
    ...PREFERRED_SIZES.map((size) => photo.sizes?.[size]),
    photo,
  ].filter((file): file is StoredFile => Boolean(file?.filename))

  const staticDir = payload.collections.photos.config.upload.staticDir
  const errors: string[] = []

  for (const { filename, url } of candidates) {
    if (staticDir && filename) {
      try {
        return await fs.readFile(path.join(staticDir, filename))
      } catch {
        /* not stored locally (R2) — fall through to HTTP */
      }
    }
    if (!url) continue
    const absolute = url.startsWith('http') ? url : `${getServerSideURL().replace(/\/$/, '')}${url}`
    try {
      const res = await fetch(absolute, {
        headers: ASSET_HEADERS,
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) return Buffer.from(await res.arrayBuffer())
      errors.push(`GET ${absolute} -> ${res.status}`)
    } catch (err) {
      errors.push(`GET ${absolute} -> ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(
    `could not read photo ${photo.id} from storage: ${errors.join(', ') || 'no readable file'}`,
  )
}
