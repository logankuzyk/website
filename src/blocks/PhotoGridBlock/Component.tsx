import type { Page, Photo, PhotoCollection } from '@/payload-types'

import { PhotoGrid, type PhotoGridItem } from '@/components/PhotoGrid'
import { PhotoSortToolbar } from '@/components/PhotoSortToolbar'
import { Separator } from '@/components/Separator/Separator'
import { getRepresentativePhoto } from '@/utilities/getRepresentativePhoto'
import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'
import { getPageUrl } from '@/utilities/getPageUrl'
import { Button } from '@/components/ui/button'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'

type PhotoGridBlockProps = {
  source?: 'collections' | 'photos' | null
  photoCollections?: (string | PhotoCollection)[] | null
  photosFrom?: 'folder' | 'collection' | null
  photosFolder?: string | { id: string } | null
  photosTags?: (string | { id: string })[] | null
  photosFromCollection?: string | PhotoCollection | null
  title?: string | null
  viewMorePage?:
    | { relationTo: 'pages'; value: string | Page }
    | { relationTo: 'photo-collections'; value: string | PhotoCollection }
    | null
  linkLabel?: string | null
  photographyIndexPage?: string | Page | null
  masonry?: boolean | null
  cropToSquare?: boolean | null
  showCollectionNames?: boolean | null
  enableFullScreen?: boolean | null
  enableCarousel?: boolean | null
  enableSortToolbar?: boolean | null
  defaultSort?: 'dateTaken' | 'filename' | 'createdAt' | 'random' | null
  defaultOrder?: 'asc' | 'desc' | null
  limit?: number | null
  overscan?: number | null
  id?: string
}

export const PhotoGridBlock: React.FC<PhotoGridBlockProps> = async (props) => {
  const {
    source = 'collections',
    photoCollections = [],
    photosFrom = 'folder',
    photosFolder,
    photosTags = [],
    photosFromCollection,
    title,
    viewMorePage,
    linkLabel = 'View more',
    photographyIndexPage,
    masonry = true,
    cropToSquare = false,
    showCollectionNames = true,
    enableFullScreen = true,
    enableCarousel = true,
    enableSortToolbar = true,
    defaultSort = 'dateTaken',
    defaultOrder = 'desc',
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
    let where: { mimeType: { contains: 'image' }; folder?: { equals: string }; tags?: { in: string[] } } | ReturnType<typeof getPhotoCollectionWhere>

    if (photosFrom === 'collection' && photosFromCollection) {
      const collection =
        typeof photosFromCollection === 'object'
          ? photosFromCollection
          : await payload.findByID({
              collection: 'photo-collections',
              id: photosFromCollection as string,
              depth: 1,
            })
      if (collection && typeof collection === 'object') {
        where = getPhotoCollectionWhere(collection as PhotoCollection)
      } else {
        where = { mimeType: { contains: 'image' as const }, id: { in: [] as string[] } }
      }
    } else {
      const folderId =
        typeof photosFolder === 'object' && photosFolder ? photosFolder.id : photosFolder
      const tagIds = Array.isArray(photosTags)
        ? photosTags.map((t) => (typeof t === 'object' && t ? t.id : t)).filter(Boolean)
        : []

      const hasFolder = Boolean(folderId)
      const hasTags = tagIds.length > 0

      where = {
        mimeType: { contains: 'image' as const },
        ...(hasFolder && { folder: { equals: folderId as string } }),
        ...(hasTags && { tags: { in: tagIds as string[] } }),
      }
    }

    const fetchLimit = limit != null && limit > 0 ? limit : 200
    const result = await payload.find({
      collection: 'photos',
      depth: 3,
      limit: fetchLimit,
      overrideAccess: false,
      sort: 'createdAt',
      where,
    })

    const photos = (result.docs ?? []) as Photo[]
    items = photos.map((photo) => ({ type: 'photo' as const, photo }))
  }

  const emptyMessage =
    source === 'collections'
      ? 'No collections selected. Add photo collections in the block settings.'
      : photosFrom === 'collection'
        ? 'No photo collection selected. Select a collection in the block settings.'
        : 'No photos yet. Select a folder in the block settings and upload images to it in Photos.'

  const hasTitle = title && title.trim().length > 0

  let viewMoreHref = ''
  let viewMoreLabel = linkLabel || 'View more'
  if (viewMorePage && 'relationTo' in viewMorePage && viewMorePage.value) {
    const { relationTo, value } = viewMorePage
    if (relationTo === 'pages') {
      const page =
        typeof value === 'object' && value
          ? value
          : await payload.findByID({
              collection: 'pages',
              id: value as string,
              depth: 0,
            })
      viewMoreHref = getPageUrl(page)
      if (!linkLabel && page?.title) {
        viewMoreLabel = page.title as string
      }
    } else if (relationTo === 'photo-collections') {
      const collection =
        typeof value === 'object' && value
          ? value
          : await payload.findByID({
              collection: 'photo-collections',
              id: value as string,
              depth: 0,
            })
      if (collection?.slug) {
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
        viewMoreHref = `${basePath}/${collection.slug}`
        if (!linkLabel && collection.name) {
          viewMoreLabel = collection.name
        }
      }
    }
  }

  const showSortToolbar = Boolean(
    source !== 'collections' && hasTitle && enableSortToolbar !== false,
  )

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      {hasTitle && (
        <header className={showSortToolbar ? 'mb-4' : 'mb-12'}>
          <h2 className="font-serif text-4xl tracking-[-0.01em] text-foreground md:text-5xl">
            {title}
          </h2>
          <Separator />
        </header>
      )}
      {showSortToolbar && (
        <div className="mb-8">
          <PhotoSortToolbar
            defaultSort={defaultSort ?? 'dateTaken'}
            defaultOrder={defaultOrder ?? 'desc'}
          />
        </div>
      )}
      <PhotoGrid
        items={items}
        masonry={masonry !== false}
        cropToSquare={cropToSquare === true}
        showCollectionNames={showCollectionNames !== false}
        enableFullScreen={enableFullScreen !== false}
        enableCarousel={enableCarousel !== false}
        enableSortToolbar={showSortToolbar}
        defaultSort={defaultSort ?? 'dateTaken'}
        defaultOrder={defaultOrder ?? 'desc'}
        emptyMessage={emptyMessage}
        limit={limit != null && limit > 0 ? limit : undefined}
        overscan={overscan != null && overscan >= 0 ? overscan : undefined}
      />
      {viewMorePage && viewMoreHref && (
        <div className="mt-10">
          <Button
            asChild
            variant="default"
            className="rounded-none"
          >
            <Link href={viewMoreHref}>{viewMoreLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
