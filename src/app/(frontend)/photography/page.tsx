import type { Photo, PhotoCollection } from '@/payload-types'
import type { Metadata } from 'next'

import { Media as MediaComponent } from '@/components/Media'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { CareerTimeline } from '@/components/CareerTimeline/CareerTimeline'
import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'
import { draftMode } from 'next/headers'

import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'
import { getPageUrl } from '@/utilities/getPageUrl'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'
import { queryPageBySlug } from '@/utilities/queryPageBySlug'
import PageClient from '../[slug]/page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

async function getRepresentativePhotoForCollection(
  collection: PhotoCollection,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<Photo | null> {
  if (collection.coverImage && typeof collection.coverImage === 'object' && collection.coverImage) {
    return collection.coverImage as Photo
  }
  const where = getPhotoCollectionWhere(collection)
  const result = await payload.find({
    collection: 'photos',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    sort: 'displayOrder',
    where,
  })
  return (result.docs?.[0] as Photo) ?? null
}

function PhotographyIndexContent({
  collectionsWithPhotos,
  basePath,
}: {
  collectionsWithPhotos: { collection: PhotoCollection; photo: Photo | null }[]
  basePath: string
}) {
  return (
    <div className="container pt-8">
      <header className="mb-16">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Photography</h1>
        <Separator />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collectionsWithPhotos.map(({ collection, photo }) => (
          <Link
            key={collection.id}
            href={`${basePath}/${collection.slug}`}
            className="group block w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <div className="relative aspect-square w-full overflow-hidden">
              {photo ? (
                <MediaComponent
                  resource={photo}
                  fill
                  className="relative block size-full transition-transform duration-300 group-hover:scale-105"
                  imgClassName="object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                  No photos
                </div>
              )}
            </div>
            <span className="mt-2 block text-left text-sm font-medium">{collection.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function PhotographyIndexPage() {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const page = await queryPageBySlug({ slug: 'photography' })

  if (page) {
    const { hero, layout, template } = page
    return (
      <article className="pb-24">
        <PageClient />
        <PayloadRedirects disableNotFound url="/photography" />
        {draft && <LivePreviewListener />}
        <RenderHero {...hero} />
        {template === 'career' && <CareerPageContent />}
        {template === 'photos' && <PhotosPageContent page={page} />}
        {(template === 'default' || !template) && <RenderBlocks blocks={layout ?? []} />}
      </article>
    )
  }

  const site = await payload.findGlobal({ slug: 'site', depth: 1 })
  const indexPage =
    typeof site.photographyIndexPage === 'object' && site.photographyIndexPage
      ? site.photographyIndexPage
      : site.photographyIndexPage
        ? await payload.findByID({
            collection: 'pages',
            id: site.photographyIndexPage as string,
            depth: 0,
          })
        : null
  const baseUrl = getPageUrl(indexPage)
  const basePath = !indexPage || baseUrl === '/' ? '/photography' : baseUrl

  const collectionsResult = await payload.find({
    collection: 'photo-collections',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: ['displayOrder', 'name'],
    where: {
      and: [
        { hiddenFromIndex: { not_equals: true } },
        { or: [{ parent: { exists: false } }, { parent: { equals: null } }] },
      ],
    },
  })

  const collections = (collectionsResult.docs ?? []) as PhotoCollection[]

  const collectionsWithPhotos = await Promise.all(
    collections.map(async (collection) => {
      const photo = await getRepresentativePhotoForCollection(collection, payload)
      return { collection, photo }
    })
  )

  return (
    <article className="pb-24">
      <PayloadRedirects disableNotFound url={basePath} />
      <PhotographyIndexContent
        collectionsWithPhotos={collectionsWithPhotos}
        basePath={basePath}
      />
    </article>
  )
}

async function CareerPageContent() {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'career',
    depth: 2,
    limit: 100,
    overrideAccess: false,
    sort: '-startDate',
    where: { _status: { equals: 'published' } },
  })
  return (
    <div className="container pt-8">
      <header className="mb-16">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Career</h1>
        <Separator />
      </header>
      <CareerTimeline entries={docs} />
    </div>
  )
}

async function PhotosPageContent({
  page,
}: {
  page: NonNullable<Awaited<ReturnType<typeof queryPageBySlug>>>
}) {
  const payload = await getPayload({ config: configPromise })
  const photosSource = page.photosSource ?? 'photos'

  let items: PhotoGridItem[] = []

  if (photosSource === 'collections') {
    const collectionRefs = page.photoCollections
    const collectionIds = Array.isArray(collectionRefs)
      ? collectionRefs.map((c) => (typeof c === 'object' && c ? c.id : c)).filter(Boolean)
      : []

    const indexPageRef = page.photosPhotographyIndexPage
    const indexPage =
      typeof indexPageRef === 'object' && indexPageRef
        ? indexPageRef
        : indexPageRef
          ? await payload.findByID({
              collection: 'pages',
              id: indexPageRef as string,
              depth: 0,
            })
          : null
    const baseUrl = getPageUrl(indexPage)
    const basePath = !indexPage || baseUrl === '/' ? '/photography' : baseUrl

    for (const id of collectionIds) {
      const collection = (await payload.findByID({
        collection: 'photo-collections',
        id: id as string,
        depth: 1,
      })) as PhotoCollection | null
      if (!collection) continue

      const photo = await getRepresentativePhoto(collection, payload)
      if (!photo) continue

      items.push({
        type: 'collection',
        photo,
        collectionName: collection.name,
        href: `${basePath}/${collection.slug}`,
      })
    }
  } else {
    const photosFolder =
      typeof page.photosFolder === 'object' && page.photosFolder
        ? page.photosFolder.id
        : page.photosFolder
    const photosTags = Array.isArray(page.photosTags)
      ? page.photosTags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
      : []

    const hasFolder = Boolean(photosFolder)
    const hasTags = photosTags.length > 0

    const where = {
      mimeType: { contains: 'image' as const },
      ...(hasFolder && { folder: { equals: photosFolder } }),
      ...(hasTags && { tags: { in: photosTags } }),
    }

    const fetchLimit = page.photosLimit != null && page.photosLimit > 0 ? page.photosLimit : 200
    const result = await payload.find({
      collection: 'photos',
      depth: 1,
      limit: fetchLimit,
      overrideAccess: false,
      sort: 'displayOrder',
      where,
    })

    const photos = (result.docs ?? []) as Photo[]
    items = photos.map((photo) => ({ type: 'photo' as const, photo }))
  }

  const emptyMessage =
    photosSource === 'collections'
      ? 'No collections selected. Add photo collections in the page settings.'
      : 'No photos yet. Select a folder in the page settings and upload images to it in Photos.'

  return (
    <div className="container pt-8">
      <header className="mb-16">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
          {page.title || 'Photos'}
        </h1>
        <Separator />
      </header>
      <PhotoGrid
        items={items}
        masonry={page.photosMasonry !== false}
        cropToSquare={page.photosCropToSquare === true}
        showCollectionNames={page.photosShowCollectionNames !== false}
        enableFullScreen={page.photosEnableFullScreen !== false}
        enableCarousel={page.photosEnableCarousel !== false}
        emptyMessage={emptyMessage}
        limit={page.photosLimit != null && page.photosLimit > 0 ? page.photosLimit : undefined}
      />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await queryPageBySlug({ slug: 'photography' })
  if (page) {
    const { generateMeta } = await import('@/utilities/generateMeta')
    return generateMeta({ doc: page })
  }

  const payload = await getPayload({ config: configPromise })
  const site = await payload.findGlobal({ slug: 'site', depth: 1 })
  const indexPage =
    typeof site.photographyIndexPage === 'object' && site.photographyIndexPage
      ? site.photographyIndexPage
      : site.photographyIndexPage
        ? await payload.findByID({
            collection: 'pages',
            id: site.photographyIndexPage as string,
            depth: 0,
          })
        : null
  const baseUrl = getPageUrl(indexPage)
  const basePath = !indexPage || baseUrl === '/' ? '/photography' : baseUrl

  const title = 'Photo Collections | Logan Kuzyk'
  return {
    title,
    openGraph: mergeOpenGraph({
      title,
      url: `${getServerSideURL()}${basePath}`,
    }),
  }
}
