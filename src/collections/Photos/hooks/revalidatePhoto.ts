import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidatePhoto: CollectionAfterChangeHook = (args) => {
  if (!args.req.context.disableRevalidate) {
    revalidateTag('photos-sitemap')
  }
  return args.doc
}

export const revalidateDelete: CollectionAfterDeleteHook = (args) => {
  if (!args.req.context.disableRevalidate) {
    revalidateTag('photos-sitemap')
  }
  return args.doc
}
