import type { Photo, PhotoCollection } from '@/payload-types'

import { PhotosPreviewCard } from '@/components/PhotosPreviewCard/PhotosPreviewCard'
import { Separator } from '@/components/Separator/Separator'
import { Button } from '@/components/ui/button'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

type PhotosPreviewItem = {
  photoCollection: string | PhotoCollection
  id?: string | null
}

type PhotosPreviewBlockProps = {
  items?: PhotosPreviewItem[] | null
  title?: string | null
  showViewMore?: boolean | null
  linkLabel?: string | null
  id?: string
}

async function getRepresentativePhoto(
  collection: PhotoCollection,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<Photo | null> {
  if (collection.coverImage && typeof collection.coverImage === 'object' && collection.coverImage) {
    return collection.coverImage as Photo
  }
  const tagIds = Array.isArray(collection.tags)
    ? collection.tags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
    : []
  if (tagIds.length === 0) return null
  const result = await payload.find({
    collection: 'photos',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    sort: 'displayOrder',
    where: {
      mimeType: { contains: 'image' },
      tags: { in: tagIds },
    },
  })
  return (result.docs?.[0] as Photo) ?? null
}

async function resolveItem(
  item: PhotosPreviewItem,
  payload: Awaited<ReturnType<typeof getPayload>>
): Promise<{ photo: Photo; title: string; href: string } | null> {
  const collectionRef = item.photoCollection
  if (!collectionRef || (typeof collectionRef === 'string' && !collectionRef.trim())) {
    return null
  }

  const collection =
    typeof collectionRef === 'object' && collectionRef
      ? collectionRef
      : await payload.findByID({
          collection: 'photo-collections',
          id: collectionRef as string,
          depth: 1,
        })

  if (!collection || typeof collection !== 'object') return null

  const photo = await getRepresentativePhoto(collection as PhotoCollection, payload)
  if (!photo) return null

  return {
    photo,
    title: collection.name,
    href: `/photography/${collection.slug}`,
  }
}

export const PhotosPreviewBlock: React.FC<PhotosPreviewBlockProps> = async (props) => {
  const {
    items = [],
    title,
    showViewMore = true,
    linkLabel = 'View more',
    id,
  } = props

  const payload = await getPayload({ config: configPromise })

  const resolvedItems = await Promise.all(
    (items ?? []).slice(0, 3).map((item) => resolveItem(item, payload))
  )
  const validItems = resolvedItems.filter(
    (item): item is { photo: Photo; title: string; href: string } => item !== null
  )

  const hasTitle = title && title.trim().length > 0

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      {hasTitle && (
        <header className="mb-16">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h2>
          <Separator />
        </header>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {validItems.map((item) => (
          <PhotosPreviewCard
            key={item.href}
            photo={item.photo}
            title={item.title}
            href={item.href}
          />
        ))}
      </div>
      {showViewMore && (
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href="/photography">{linkLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
