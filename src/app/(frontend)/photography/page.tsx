import type { Photo, PhotoCollection } from '@/payload-types'
import type { Metadata } from 'next'

import { Media as MediaComponent } from '@/components/Media'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'
import { getPageUrl } from '@/utilities/getPageUrl'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

async function getRepresentativePhoto(
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

export default async function PhotographyIndexPage() {
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

  const collectionsResult = await payload.find({
    collection: 'photo-collections',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: ['displayOrder', 'name'],
    where: {
      hiddenFromIndex: { not_equals: true },
    },
  })

  const collections = (collectionsResult.docs ?? []) as PhotoCollection[]

  const collectionsWithPhotos = await Promise.all(
    collections.map(async (collection) => {
      const photo = await getRepresentativePhoto(collection, payload)
      return { collection, photo }
    })
  )

  return (
    <article className="pb-24">
      <PayloadRedirects disableNotFound url={basePath} />
      <div className="container pt-8">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Photography</h1>
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
    </article>
  )
}

export async function generateMetadata(): Promise<Metadata> {
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
