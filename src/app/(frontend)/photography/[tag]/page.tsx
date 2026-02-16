import type { Media } from '@/payload-types'
import type { Metadata } from 'next'

import { PhotosMasonry } from '@/components/PhotosMasonry/PhotosMasonry'
import { Separator } from '@/components/Separator/Separator'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

type Args = {
  params: Promise<{ tag?: string }>
}

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'tags',
      limit: 100,
      overrideAccess: false,
      pagination: false,
      select: { slug: true },
    })
    return (result.docs ?? []).map((tag) => ({ tag: tag.slug }))
  } catch {
    // MongoDB not available during build (e.g. Docker build). Pages will be generated on-demand at runtime.
    return []
  }
}

export default async function PhotographyTagPage({ params: paramsPromise }: Args) {
  const { tag: tagSlug } = await paramsPromise

  if (!tagSlug) {
    notFound()
  }

  const payload = await getPayload({ config: configPromise })

  const [photosPageResult, tagResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: { template: { equals: 'photos' } },
    }),
    payload.find({
      collection: 'tags',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: { slug: { equals: tagSlug } },
    }),
  ])

  const photosPage = photosPageResult.docs?.[0]
  const tag = tagResult.docs?.[0]

  if (!tag) {
    notFound()
  }

  const photosFolder =
    photosPage &&
    typeof photosPage.photosFolder === 'object' &&
    photosPage.photosFolder
      ? photosPage.photosFolder.id
      : photosPage?.photosFolder

  const where = {
    mimeType: { contains: 'image' as const },
    tags: { in: [tag.id] },
    ...(photosFolder && { folder: { equals: photosFolder } }),
  }

  const mediaResult = await payload.find({
    collection: 'media',
    depth: 1,
    limit: 200,
    overrideAccess: false,
    sort: 'displayOrder',
    where,
  })

  const photos = (mediaResult.docs ?? []) as Media[]

  return (
    <article className="pb-24">
      <PayloadRedirects disableNotFound url={`/photography/${tagSlug}`} />
      <div className="container pt-8">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Photography / {tag.name}
          </h1>
          <Separator />
        </header>
        <PhotosMasonry photos={photos} />
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { tag: tagSlug } = await paramsPromise

  if (!tagSlug) {
    return { title: 'Photos | Logan Kuzyk' }
  }

  const payload = await getPayload({ config: configPromise })
  const tagResult = await payload.find({
    collection: 'tags',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: tagSlug } },
  })

  const tag = tagResult.docs?.[0]
  const title = tag ? `Photography / ${tag.name} | Logan Kuzyk` : 'Photos | Logan Kuzyk'

  return {
    title,
    openGraph: mergeOpenGraph({
      title,
      url: `${getServerSideURL()}/photography/${tagSlug}`,
    }),
  }
}
