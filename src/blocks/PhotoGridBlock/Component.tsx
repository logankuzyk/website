import type { Photo, PhotoCollection } from '@/payload-types'

import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { Separator } from '@/components/Separator/Separator'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import { Button } from '@/components/ui/button'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

type PhotoGridBlockProps = {
  source?: 'collections' | 'photos' | null
  photoCollections?: (string | PhotoCollection)[] | null
  photosFolder?: string | { id: string } | null
  photosTags?: (string | { id: string })[] | null
  title?: string | null
  showViewMore?: boolean | null
  linkLabel?: string | null
  masonry?: boolean | null
  cropToSquare?: boolean | null
  showCollectionNames?: boolean | null
  enableFullScreen?: boolean | null
  enableCarousel?: boolean | null
  limit?: number | null
  id?: string
}

export const PhotoGridBlock: React.FC<PhotoGridBlockProps> = async (props) => {
  const {
    source = 'collections',
    photoCollections = [],
    photosFolder,
    photosTags = [],
    title,
    showViewMore = true,
    linkLabel = 'View more',
    masonry = true,
    cropToSquare = false,
    showCollectionNames = true,
    enableFullScreen = true,
    enableCarousel = true,
    limit,
    id,
  } = props

  const payload = await getPayload({ config: configPromise })
  let items: PhotoGridItem[] = []

  if (source === 'collections') {
    const collectionIds = Array.isArray(photoCollections)
      ? photoCollections.map((c) => (typeof c === 'object' && c ? c.id : c)).filter(Boolean)
      : []

    for (const collectionId of collectionIds) {
      const collection = await payload.findByID({
        collection: 'photo-collections',
        id: collectionId as string,
        depth: 1,
      }) as PhotoCollection | null
      if (!collection) continue

      const photo = await getRepresentativePhoto(collection, payload)
      if (!photo) continue

      items.push({
        type: 'collection',
        photo,
        collectionName: collection.name,
        href: `/photography/${collection.slug}`,
      })
    }
  } else {
    const folderId =
      typeof photosFolder === 'object' && photosFolder ? photosFolder.id : photosFolder
    const tagIds = Array.isArray(photosTags)
      ? photosTags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
      : []

    const hasFolder = Boolean(folderId)
    const hasTags = tagIds.length > 0

    const where = {
      mimeType: { contains: 'image' as const },
      ...(hasFolder && { folder: { equals: folderId } }),
      ...(hasTags && { tags: { in: tagIds } }),
    }

    const fetchLimit = limit != null && limit > 0 ? limit : 200
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
    source === 'collections'
      ? 'No collections selected. Add photo collections in the block settings.'
      : 'No photos yet. Select a folder in the block settings and upload images to it in Photos.'

  const hasTitle = title && title.trim().length > 0

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      {hasTitle && (
        <header className="mb-16">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h2>
          <Separator />
        </header>
      )}
      <PhotoGrid
        items={items}
        masonry={masonry !== false}
        cropToSquare={cropToSquare === true}
        showCollectionNames={showCollectionNames !== false}
        enableFullScreen={enableFullScreen !== false}
        enableCarousel={enableCarousel !== false}
        emptyMessage={emptyMessage}
        limit={limit != null && limit > 0 ? limit : undefined}
      />
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
