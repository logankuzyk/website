import type { Page, Photo, PhotoCollection } from '@/payload-types'

import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { Separator } from '@/components/Separator/Separator'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import { getPageUrl } from '@/utilities/getPageUrl'
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
  viewMorePage?: string | Page | null
  linkLabel?: string | null
  photographyIndexPage?: string | Page | null
  masonry?: boolean | null
  cropToSquare?: boolean | null
  showCollectionNames?: boolean | null
  enableFullScreen?: boolean | null
  enableCarousel?: boolean | null
  limit?: number | null
  overscan?: number | null
  id?: string
}

export const PhotoGridBlock: React.FC<PhotoGridBlockProps> = async (props) => {
  const {
    source = 'collections',
    photoCollections = [],
    photosFolder,
    photosTags = [],
    title,
    viewMorePage,
    linkLabel = 'View more',
    photographyIndexPage,
    masonry = true,
    cropToSquare = false,
    showCollectionNames = true,
    enableFullScreen = true,
    enableCarousel = true,
    limit,
    overscan = 2,
    id,
  } = props

  const payload = await getPayload({ config: configPromise })
  let items: PhotoGridItem[] = []

  if (source === 'collections') {
    const collectionIds = Array.isArray(photoCollections)
      ? photoCollections.map((c) => (typeof c === 'object' && c ? c.id : c)).filter(Boolean)
      : []

    const indexPage =
      typeof photographyIndexPage === 'object' && photographyIndexPage
        ? photographyIndexPage
        : photographyIndexPage
          ? await payload.findByID({
              collection: 'pages',
              id: photographyIndexPage as string,
              depth: 0,
            })
          : null
    const baseUrl = getPageUrl(indexPage)
    const basePath = !indexPage || baseUrl === '/' ? '/photography' : baseUrl

    for (const collectionId of collectionIds) {
      const collection = (await payload.findByID({
        collection: 'photo-collections',
        id: collectionId as string,
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
      depth: 3,
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

  let viewMoreHref = ''
  let viewMoreLabel = linkLabel || 'View more'
  if (viewMorePage) {
    const page =
      typeof viewMorePage === 'object' && viewMorePage
        ? viewMorePage
        : await payload.findByID({
            collection: 'pages',
            id: viewMorePage as string,
            depth: 0,
          })
    viewMoreHref = getPageUrl(page)
    if (!linkLabel && page?.title) {
      viewMoreLabel = page.title as string
    }
  }

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      {hasTitle && (
        <header className="mb-16">
          <h2 className="font-serif text-4xl tracking-[-0.01em] text-foreground md:text-5xl">
            {title}
          </h2>
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
        overscan={overscan != null && overscan >= 0 ? overscan : undefined}
      />
      {viewMorePage && viewMoreHref && (
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href={viewMoreHref}>{viewMoreLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
