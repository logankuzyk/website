import type { Media, Page, Tag } from '@/payload-types'

import { PhotosPreviewCard } from '@/components/PhotosPreviewCard/PhotosPreviewCard'
import { Separator } from '@/components/Separator/Separator'
import { Button } from '@/components/ui/button'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

type PhotosPreviewItem = {
  photo: string | Media
  tag: string | Tag
  id?: string | null
}

type PhotosPreviewBlockProps = {
  items?: PhotosPreviewItem[] | null
  photosPage?: string | null | Page
  showViewMore?: boolean | null
  linkLabel?: string | null
  id?: string
}

async function resolveItem(
  item: PhotosPreviewItem,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<{ photo: Media; tag: Tag } | null> {
  const photo =
    typeof item.photo === 'object' && item.photo
      ? item.photo
      : await payload.findByID({ collection: 'media', id: item.photo as string, depth: 1 })
  const tag =
    typeof item.tag === 'object' && item.tag
      ? item.tag
      : await payload.findByID({ collection: 'tags', id: item.tag as string, depth: 0 })

  if (!photo || !tag) return null
  return { photo: photo as Media, tag: tag as Tag }
}

export const PhotosPreviewBlock: React.FC<PhotosPreviewBlockProps> = async (props) => {
  const {
    items = [],
    photosPage: photosPageFromProps,
    showViewMore = true,
    linkLabel = 'View more',
    id,
  } = props

  const payload = await getPayload({ config: configPromise })

  let photosPage: Page | null = null
  if (photosPageFromProps) {
    if (typeof photosPageFromProps === 'object') {
      photosPage = photosPageFromProps
    } else {
      const result = await payload.findByID({
        collection: 'pages',
        id: photosPageFromProps,
        depth: 0,
      })
      photosPage = result as Page
    }
  }
  if (!photosPage) {
    const result = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: {
        slug: { in: ['photography', 'photos'] },
        template: { equals: 'photos' },
      },
    })
    photosPage = (result.docs?.[0] as Page) ?? null
  }

  const pageSlug = photosPage?.slug ?? 'photography'
  const pageTitle = photosPage?.title ?? 'Photos'

  const resolvedItems = await Promise.all(
    (items ?? []).slice(0, 3).map((item) => resolveItem(item, payload))
  )
  const validItems = resolvedItems.filter(
    (item): item is { photo: Media; tag: Tag } => item !== null
  )

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      <header className="mb-16">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{pageTitle}</h2>
        <Separator />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {validItems.map((item) => (
          <PhotosPreviewCard
            key={item.photo.id}
            photo={item.photo}
            tag={item.tag}
            photosPageSlug={pageSlug}
          />
        ))}
      </div>
      {photosPage && showViewMore && (
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href={`/${pageSlug}`}>{linkLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
