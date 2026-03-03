import type { Photo, PhotoCollection } from '@/payload-types'
import type { Metadata } from 'next'

import { CareerTimeline } from '@/components/CareerTimeline/CareerTimeline'
import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import { getPageUrl } from '@/utilities/getPageUrl'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { queryPageBySlug } from '@/utilities/queryPageBySlug'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const pages = await payload.find({
      collection: 'pages',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
      },
    })

    const params = pages.docs
      ?.filter((doc) => {
        return doc.slug !== 'home'
      })
      .map(({ slug }) => {
        return { slug }
      })

    return params ?? []
  } catch {
    // MongoDB not available during build (e.g. Docker build). Pages will be generated on-demand at runtime.
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/' + decodedSlug
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout, template } = page

  return (
    <article className="pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {template === 'career' && <CareerPageContent />}
      {template === 'photos' && <PhotosPageContent page={page} />}
      {(template === 'default' || !template) && <RenderBlocks blocks={layout ?? []} />}
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  return generateMeta({ doc: page })
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
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Career</h1>
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
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
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
