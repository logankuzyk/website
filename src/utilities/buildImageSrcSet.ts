import type { Photo } from '@/payload-types'

/**
 * The subset of generated `imageSizes` (see `src/collections/Photos.ts`) that preserve the
 * source aspect ratio. `square` and `og` are deliberately excluded: they are hard crops, and
 * mixing differently-cropped renditions into one `srcSet` lets the browser swap to an image
 * with the wrong framing.
 *
 * Ordered smallest to largest.
 */
export const RESPONSIVE_SIZE_NAMES = ['thumbnail', 'small', 'medium', 'large', 'xlarge'] as const

export type ImageCandidate = { width: number; url: string }

/**
 * Collect the responsive rendition ladder for a photo, smallest to largest, de-duplicated by
 * width.
 *
 * The untouched original (a multi-MB, full-resolution file) is only added as a candidate when
 * `includeOriginal` is set — i.e. for `priority` / LCP images that are meant to be sharp.
 * Everything else is capped at the largest generated size (`xlarge`, 1920px WebP), so a caller
 * that forgets to pass an accurate `size` can at worst over-fetch a ~1920px WebP, never the
 * raw original. Payload skips generating a size when the source is smaller, so the ladder is
 * frequently sparse.
 */
export const collectImageCandidates = (
  resource: Photo,
  { includeOriginal = false }: { includeOriginal?: boolean } = {},
): ImageCandidate[] => {
  const byWidth = new Map<number, string>()

  const sizes = resource.sizes ?? {}
  for (const name of RESPONSIVE_SIZE_NAMES) {
    const size = sizes[name]
    if (size?.url && typeof size.width === 'number' && size.width > 0) {
      if (!byWidth.has(size.width)) byWidth.set(size.width, size.url)
    }
  }

  if (
    includeOriginal &&
    resource.url &&
    typeof resource.width === 'number' &&
    resource.width > 0
  ) {
    if (!byWidth.has(resource.width)) byWidth.set(resource.width, resource.url)
  }

  // Fall back to the original only when Payload generated no sizes at all (e.g. a tiny source
  // where every target exceeded it) — otherwise there would be nothing to render.
  if (byWidth.size === 0 && resource.url && typeof resource.width === 'number' && resource.width > 0) {
    byWidth.set(resource.width, resource.url)
  }

  return [...byWidth.entries()].map(([width, url]) => ({ width, url })).sort((a, b) => a.width - b.width)
}

/**
 * Given the requested render width (in device pixels, as Next.js Image passes to a custom
 * loader), return the URL of the smallest candidate that covers it, falling back to the
 * largest available when none is wide enough.
 */
export const pickImageCandidate = (
  candidates: ImageCandidate[],
  requestedWidth: number,
): string | undefined => {
  if (candidates.length === 0) return undefined
  const covering = candidates.find((c) => c.width >= requestedWidth)
  return (covering ?? candidates[candidates.length - 1]).url
}
