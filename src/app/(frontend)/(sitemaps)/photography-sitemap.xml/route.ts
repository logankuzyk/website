import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getServerSideURL } from '@/utilities/getURL'

const getPhotographySitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL = getServerSideURL()

    const results = await payload.find({
      collection: 'photo-collections',
      overrideAccess: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        hiddenFromIndex: { not_equals: true },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const sitemap = results.docs
      ? results.docs
          .filter((collection) => Boolean(collection?.slug))
          .map((collection) => ({
            loc: `${SITE_URL}/photography/${collection?.slug}`,
            lastmod: collection.updatedAt || dateFallback,
          }))
      : []

    return sitemap
  },
  ['photography-sitemap'],
  {
    tags: ['photography-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPhotographySitemap()

  return getServerSideSitemap(sitemap)
}
