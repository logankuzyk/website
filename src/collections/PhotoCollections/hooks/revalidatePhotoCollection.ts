import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { PhotoCollection } from '../../../payload-types'

export const revalidatePhotoCollection: CollectionAfterChangeHook<PhotoCollection> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/photography/${doc.slug}`

    payload.logger.info(`Revalidating photo collection at path: ${path}`)

    revalidatePath(path)
    revalidateTag('photography-sitemap')
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<PhotoCollection> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/photography/${doc?.slug}`

    revalidatePath(path)
    revalidateTag('photography-sitemap')
  }

  return doc
}
