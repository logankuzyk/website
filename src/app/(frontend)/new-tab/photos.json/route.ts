import type { Photo } from '@/payload-types'

import { createHash } from 'crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { buildNewTabManifest } from '@/utilities/buildNewTabManifest'
import {
  getPhotoCollectionFetchLimit,
  getPhotoCollectionWhere,
} from '@/utilities/getPhotoCollectionWhere'
import { getPhotographyBasePath } from '@/utilities/getPhotographyBasePath'
import { getServerSideURL } from '@/utilities/getURL'

// Read by the new tab browser extension (github.com/logankuzyk/ntp). Lives outside /api so it
// can't collide with Payload's `(payload)/api/[...slug]` catch-all. `ACAO: *` means the
// extension needs no host permissions; it revalidates with If-None-Match, which is not a
// CORS-safelisted header, so the preflight must allow it and ETag must be exposed.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
}

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400'

const getNewTabManifest = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const siteUrl = getServerSideURL()

    const [photos, collections, site] = await Promise.all([
      payload.find({
        collection: 'photos',
        overrideAccess: false,
        where: { showInNewTab: { equals: true } },
        // Deep enough to populate the location's parent chain (city → region → country).
        depth: 3,
        pagination: false,
        sort: 'createdAt',
        select: {
          alt: true,
          // The storage plugin builds `url` and every `sizes.*.url` from filename + prefix, so
          // both must be selected or the renditions lose their `photos/{objectID}` path.
          filename: true,
          prefix: true,
          url: true,
          width: true,
          height: true,
          focalX: true,
          focalY: true,
          sizes: true,
          exif: true,
          location: true,
        },
      }),
      payload.find({
        collection: 'photo-collections',
        overrideAccess: false,
        where: { hiddenFromIndex: { not_equals: true } },
        sort: 'displayOrder',
        depth: 0,
        pagination: false,
      }),
      payload.findGlobal({ slug: 'site', depth: 0 }),
    ])

    // Link each photo to the first visible collection (by displayOrder) whose page can open it
    // from `?photo=`. That rules out collection sets (they render child tiles, not photos),
    // collections with fullscreen off, and photos past the page's fetch limit.
    const parentIds = new Set(
      collections.docs.map((c) => (typeof c.parent === 'object' ? c.parent?.id : c.parent)),
    )
    const collectionSlugByPhotoId = new Map<string, string>()
    let unassigned = new Set(photos.docs.map((photo) => photo.id))
    for (const collection of collections.docs) {
      if (unassigned.size === 0) break
      if (!collection.slug || parentIds.has(collection.id)) continue
      if (collection.displayEnableFullScreen === false) continue
      // Same query as the collection page, so these are exactly the photos it renders.
      const rendered = await payload.find({
        collection: 'photos',
        overrideAccess: false,
        where: getPhotoCollectionWhere(collection),
        sort: 'createdAt',
        limit: getPhotoCollectionFetchLimit(collection),
        depth: 0,
        select: {},
      })
      for (const { id } of rendered.docs) {
        if (unassigned.has(id)) collectionSlugByPhotoId.set(id, collection.slug)
      }
      unassigned = new Set([...unassigned].filter((id) => !collectionSlugByPhotoId.has(id)))
    }

    const body = JSON.stringify(
      buildNewTabManifest({
        photos: photos.docs as Photo[],
        collectionSlugByPhotoId,
        siteUrl,
        basePath: await getPhotographyBasePath(site.photographyIndexPage, payload),
      }),
    )
    const etag = `"${createHash('sha256').update(body).digest('base64url')}"`

    return { body, etag }
  },
  ['new-tab-photos'],
  {
    // global_site: the photography index page (and so every pageUrl) comes from the site global.
    tags: ['new-tab-photos', 'global_site'],
    // Backstop for anything that feeds the manifest without revalidating the tag.
    revalidate: 86400,
  },
)

export async function GET(request: Request) {
  const { body, etag } = await getNewTabManifest()
  const headers = { ...CORS_HEADERS, 'Cache-Control': CACHE_CONTROL, ETag: etag }

  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch?.split(',').some((tag) => tag.trim() === etag)) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(body, {
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' },
  })
}
