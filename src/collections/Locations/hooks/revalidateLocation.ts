import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

// Location names are baked into each new tab photo's `location` string.
export const revalidateLocation: CollectionAfterChangeHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateTag('new-tab-photos')
  }
  return doc
}

export const revalidateLocationDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateTag('new-tab-photos')
  }
  return doc
}
