import type { Media } from '@/payload-types'
import type { Metadata } from 'next'

import { CareerTimeline } from '@/components/CareerTimeline/CareerTimeline'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { PhotosMasonry } from '@/components/PhotosMasonry/PhotosMasonry'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
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

  return params
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
    <article className="pt-16 pb-24">
      <PageClient />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      {template === 'career' && <CareerPageContent />}
      {template === 'photos' && (
        <PhotosPageContent
          photosFolder={
            typeof page.photosFolder === 'object' && page.photosFolder
              ? page.photosFolder.id
              : page.photosFolder
          }
          photosTags={
            Array.isArray(page.photosTags)
              ? page.photosTags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
              : []
          }
          title={page.title}
        />
      )}
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

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

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
        <div className="mt-4 h-px w-16 bg-foreground/20" aria-hidden />
      </header>
      <CareerTimeline entries={docs} />
    </div>
  )
}

async function PhotosPageContent({
  photosFolder,
  photosTags,
  title,
}: {
  photosFolder: string | number | null | undefined
  photosTags?: (string | number)[]
  title?: string | null
}) {
  const payload = await getPayload({ config: configPromise })
  let photos: Media[] = []

  const hasFolder = Boolean(photosFolder)
  const hasTags = Array.isArray(photosTags) && photosTags.length > 0

  if (hasFolder || hasTags) {
    const where = {
      mimeType: { contains: 'image' as const },
      ...(hasFolder && { folder: { equals: photosFolder } }),
      ...(hasTags && { tags: { in: photosTags } }),
    }

    const result = await payload.find({
      collection: 'media',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      sort: 'displayOrder',
      where,
    })
    photos = (result.docs ?? []) as Media[]
  }

  return (
    <div className="container pt-8">
      <header className="mb-16">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title || 'Photos'}</h1>
        <div className="mt-4 h-px w-16 bg-foreground/20" aria-hidden />
      </header>
      <PhotosMasonry photos={photos} />
    </div>
  )
}
