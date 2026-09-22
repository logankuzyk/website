import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { revalidateTag } from 'next/cache'

// Tag names and slugs are baked into each new tab photo's `tags`. `revalidateTag` throws outside
// a Next cache scope (scripts, seeding), which must not fail the write.
const revalidateNewTab = (req: PayloadRequest) => {
  if (req.context.disableRevalidate) return
  try {
    revalidateTag('new-tab-photos')
  } catch (err) {
    req.payload.logger.warn(
      `revalidatePhotoTag: revalidateTag(new-tab-photos) failed: ${String(err)}`,
    )
  }
}

export const revalidatePhotoTag: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateNewTab(req)
  return doc
}

export const revalidatePhotoTagDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateNewTab(req)
  return doc
}
