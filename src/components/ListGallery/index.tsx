import type { BeforeListTableServerProps, CollectionSlug } from 'payload'

import React from 'react'

import type { GalleryItem } from './index.client'

import { ListGalleryClient } from './index.client'

type DocID = number | string

type ListDoc = { id: DocID } & Record<string, unknown>

/** The parts of an upload document the gallery reads. */
export type ImageDoc = {
  alt?: null | string
  id: DocID
  mimeType?: null | string
  sizes?: null | Record<string, { url?: null | string } | undefined>
  url?: null | string
}

type ServerProps = Pick<BeforeListTableServerProps, 'payload' | 'user'>

export type ListGalleryProps = {
  /**
   * Resolves an image for documents whose `imageField` is empty.
   */
  fallbackImage?: (doc: ListDoc, serverProps: ServerProps) => Promise<ImageDoc | null>
  imageField?: string
} & BeforeListTableServerProps

const isID = (value: unknown): value is DocID =>
  typeof value === 'string' || typeof value === 'number'

// `square` is the only cropped rendition (and honours the focal point). Renditions are sparse:
// one is skipped when the source is smaller than it, so fall through to the uncropped ones.
const previewURL = (image: ImageDoc | null | undefined): null | string => {
  if (!image || (image.mimeType && !image.mimeType.startsWith('image/'))) return null
  const { sizes } = image
  return sizes?.square?.url || sizes?.small?.url || sizes?.thumbnail?.url || image.url || null
}

/**
 * The gallery layout of a collection's list view: the same page of documents as the table
 * (search, filters, sort and pagination all still apply) as square previews. Shown when the
 * switch in `GalleryListView` is set to gallery; register both with `listGallery` in `./config`.
 */
export const ListGallery = async ({
  collectionConfig,
  collectionSlug,
  data,
  fallbackImage,
  i18n,
  imageField,
  payload,
  user,
}: ListGalleryProps) => {
  const docs = (data?.docs ?? []) as ListDoc[]
  const images = new Map<DocID, ImageDoc | null>()

  if (imageField) {
    const field = collectionConfig.flattenedFields.find(({ name }) => name === imageField)
    if (field?.type !== 'upload' || typeof field.relationTo !== 'string') {
      throw new Error(
        `ListGallery: "${imageField}" is not a single-collection upload field on "${collectionSlug}"`,
      )
    }

    // The list view queries at depth 0, so the field holds IDs. Populate them in one query.
    const imageIDs = [...new Set(docs.map((doc) => doc[imageField]).filter(isID))]
    const related = imageIDs.length
      ? await payload.find({
          collection: field.relationTo as CollectionSlug,
          depth: 0,
          limit: imageIDs.length,
          overrideAccess: false,
          pagination: false,
          user,
          where: { id: { in: imageIDs } },
        })
      : { docs: [] }
    const byID = new Map((related.docs as ImageDoc[]).map((image) => [image.id, image]))

    await Promise.all(
      docs.map(async (doc) => {
        const imageID = doc[imageField]
        const image = isID(imageID) ? byID.get(imageID) : undefined
        images.set(doc.id, image ?? (await fallbackImage?.(doc, { payload, user })) ?? null)
      }),
    )
  } else {
    for (const doc of docs) images.set(doc.id, doc as ImageDoc)
  }

  const { useAsTitle = 'id' } = collectionConfig.admin
  const items: GalleryItem[] = docs.map((doc) => {
    const image = images.get(doc.id)
    const title = doc[useAsTitle]

    return {
      id: doc.id,
      alt: image?.alt ?? '',
      src: previewURL(image),
      title:
        typeof title === 'string' && title
          ? title
          : typeof title === 'number'
            ? String(title)
            : `[${i18n.t('general:untitled')}]`,
    }
  })

  return <ListGalleryClient collectionSlug={collectionSlug} items={items} />
}
