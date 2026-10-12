import type { PhotoCollection } from '@/payload-types'

import React from 'react'

import { getPhotoCollectionWhere } from '@/utilities/getPhotoCollectionWhere'

import type { ListGalleryProps } from './index'

import { ListGallery } from './index'

/**
 * List gallery for photo collections. Mirrors `getRepresentativePhoto`: a collection without
 * a cover image is represented by the first photo matching its filter.
 */
export const PhotoCollectionsGallery = (props: ListGalleryProps) => (
  <ListGallery
    {...props}
    fallbackImage={async (doc, { payload, user }) => {
      const { docs } = await payload.find({
        collection: 'photos',
        depth: 0,
        limit: 1,
        overrideAccess: false,
        pagination: false,
        sort: 'createdAt',
        user,
        where: getPhotoCollectionWhere(doc as unknown as PhotoCollection),
      })
      return docs[0] ?? null
    }}
  />
)
