/**
 * Absolute URL for a photo (or one of its renditions). Returns null when there is nothing to
 * link to.
 */
export function getPhotoImageUrl(
  photo: { url?: string | null; filename?: string | null; prefix?: string | null },
  siteUrl: string,
): string | null {
  // Prefer absolute URLs (R2/CDN in production) — Payload's generateFileURL produces the correct path
  if (photo.url) {
    if (photo.url.startsWith('http://') || photo.url.startsWith('https://')) {
      return photo.url
    }
    return `${siteUrl}${photo.url.startsWith('/') ? '' : '/'}${photo.url}`
  }
  // Fallback: build R2 URL when STORAGE_URL is set (prefix includes photos/{objectID})
  if (photo.filename && process.env.STORAGE_URL) {
    const baseUrl = process.env.STORAGE_URL.replace(/\/$/, '')
    if (photo.prefix) {
      return [baseUrl, photo.prefix, encodeURIComponent(photo.filename)].filter(Boolean).join('/')
    }
    return [baseUrl, 'photos', encodeURIComponent(photo.filename)].join('/')
  }
  if (photo.filename) {
    return `${siteUrl}/photos/${encodeURIComponent(photo.filename)}`
  }
  return null
}
