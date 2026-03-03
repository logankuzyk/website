import type { Photo, PhotoCollection } from '@/payload-types'
import type { Metadata } from 'next'

import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'
import { getPageUrl } from '@/utilities/getPageUrl'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

type Args = {
  params: Promise<{ slug?: string }>
}

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'photo-collections',
      limit: 100,
      overrideAccess: false,
      pagination: false,
      select: { slug: true },
    })
    return (result.docs ?? []).map((doc) => ({ slug: doc.slug }))
  } catch {
    // MongoDB not available during build (e.g. Docker build). Pages will be generated on-demand at runtime.
    return []
  }
}

export default async function PhotographyCollectionPage({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise

  if (!slug) {
    notFound()
  }

  const payload = await getPayload({ config: configPromise })

  const collectionResult = await payload.find({
    collection: 'photo-collections',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })

  const collection = collectionResult.docs?.[0] as PhotoCollection | undefined

  if (!collection) {
    notFound()
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

  const childCollectionsResult = await payload.find({
    collection: 'photo-collections',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: ['displayOrder', 'name'],
    where: {
      and: [
        { parent: { equals: collection.id } },
        { hiddenFromIndex: { not_equals: true } },
      ],
    },
  })

  const childCollections = (childCollectionsResult.docs ?? []) as PhotoCollection[]
  const isCollectionSet = childCollections.length > 0

  if (isCollectionSet) {
    const collectionsWithPhotos = await Promise.all(
      childCollections.map(async (child) => {
        const photo = await getRepresentativePhoto(child, payload)
        return { collection: child, photo }
      })
    )

    const items: PhotoGridItem[] = collectionsWithPhotos.map(({ collection: child, photo }) => ({
      type: 'collection' as const,
      photo,
      collectionName: child.name,
      href: `${basePath}/${child.slug}`,
    }))

    return (
      <article className="pb-24">
        <PayloadRedirects disableNotFound url={`${basePath}/${slug}`} />
        <div className="container pt-8">
          <header className="mb-16">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Photography / {collection.name}
            </h1>
            <Separator />
          </header>
          <PhotoGrid
            items={items}
            masonry={false}
            cropToSquare={true}
            showCollectionNames={true}
            enableFullScreen={false}
            enableCarousel={false}
          />
        </div>
      </article>
    )
  }

  const where = getPhotoCollectionWhere(collection)

  const fetchLimit =
    collection.displayLimit != null && collection.displayLimit > 0 ? collection.displayLimit : 200
  const photosResult = await payload.find({
    collection: 'photos',
    depth: 1,
    limit: fetchLimit,
    overrideAccess: false,
    sort: 'displayOrder',
    where,
  })

  const photos = (photosResult.docs ?? []) as Photo[]
  const items = photos.map((photo) => ({ type: 'photo' as const, photo }))

  return (
    <article className="pb-24">
      <PayloadRedirects disableNotFound url={`${basePath}/${slug}`} />
      <div className="container pt-8">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Photography / {collection.name}
          </h1>
          <Separator />
        </header>
        <PhotoGrid
          items={items}
          masonry={collection.displayMasonry !== false}
          cropToSquare={collection.displayCropToSquare === true}
          enableFullScreen={collection.displayEnableFullScreen !== false}
          enableCarousel={collection.displayEnableCarousel !== false}
          limit={
            collection.displayLimit != null && collection.displayLimit > 0
              ? collection.displayLimit
              : undefined
          }
        />
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise

  if (!slug) {
    return { title: 'Photos | Logan Kuzyk' }
  }

  const payload = await getPayload({ config: configPromise })
  const collectionResult = await payload.find({
    collection: 'photo-collections',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })

  const collection = collectionResult.docs?.[0]
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

  const title = collection
    ? `Photography / ${collection.name} | Logan Kuzyk`
    : 'Photos | Logan Kuzyk'

  return {
    title,
    openGraph: mergeOpenGraph({
      title,
      url: `${getServerSideURL()}${basePath}/${slug}`,
    }),
  }
}
