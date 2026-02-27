import type { Photo, PhotoCollection } from '@/payload-types'
import type { Metadata } from 'next'

import { PhotosMasonry } from '@/components/PhotosMasonry/PhotosMasonry'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'
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

  const where = getPhotoCollectionWhere(collection)

  const photosResult = await payload.find({
    collection: 'photos',
    depth: 1,
    limit: 200,
    overrideAccess: false,
    sort: 'displayOrder',
    where,
  })

  const photos = (photosResult.docs ?? []) as Photo[]

  return (
    <article className="pb-24">
      <PayloadRedirects disableNotFound url={`/photography/${slug}`} />
      <div className="container pt-8">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Photography / {collection.name}
          </h1>
          <Separator />
        </header>
        <PhotosMasonry photos={photos} />
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
  const title = collection
    ? `Photography / ${collection.name} | Logan Kuzyk`
    : 'Photos | Logan Kuzyk'

  return {
    title,
    openGraph: mergeOpenGraph({
      title,
      url: `${getServerSideURL()}/photography/${slug}`,
    }),
  }
}
