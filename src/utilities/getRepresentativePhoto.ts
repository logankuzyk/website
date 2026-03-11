import type { Photo, PhotoCollection } from '@/payload-types'

import { getPhotoCollectionWhere } from './getPhotoCollectionWhere'

type PayloadInstance = Awaited<ReturnType<typeof import('payload').getPayload>>

/**
 * Returns the representative photo for a collection: cover image if set,
 * otherwise the first photo matching the collection filter.
 */
export async function getRepresentativePhoto(
  collection: PhotoCollection,
  payload: PayloadInstance
): Promise<Photo | null> {
  if (collection.coverImage && typeof collection.coverImage === 'object' && collection.coverImage) {
    return collection.coverImage as Photo
  }
  const where = getPhotoCollectionWhere(collection)
  const result = await payload.find({
    collection: 'photos',
    depth: 3,
    limit: 1,
    overrideAccess: false,
    sort: 'displayOrder',
    where,
  })
  return (result.docs?.[0] as Photo) ?? null
}
