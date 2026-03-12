import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getServerSideURL } from '@/utilities/getURL'

function getPhotoImageUrl(
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

const getPhotosSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL = getServerSideURL()

    const results = await payload.find({
      collection: 'photos',
      overrideAccess: false,
      depth: 0,
      limit: 5000,
      pagination: false,
      select: {
        url: true,
        filename: true,
        prefix: true,
        alt: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const sitemap = results.docs
      ? results.docs
          .map((photo) => {
            const imageUrl = getPhotoImageUrl(photo, SITE_URL)
            if (!imageUrl) return null

            const imageEntry = {
              loc: { href: imageUrl } as unknown as URL,
              ...(photo.alt && { title: photo.alt }),
            }

            return {
              loc: imageUrl,
              lastmod: photo.updatedAt || dateFallback,
              images: [imageEntry],
            }
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      : []

    return sitemap
  },
  ['photos-sitemap'],
  {
    tags: ['photos-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPhotosSitemap()

  return getServerSideSitemap(sitemap)
}
