import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getServerSideURL } from '@/utilities/getURL'
import { getPhotoImageUrl } from '@/utilities/getPhotoImageUrl'

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
