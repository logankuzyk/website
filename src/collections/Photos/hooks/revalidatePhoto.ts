import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

// A cache-revalidation failure must never abort the write. `revalidateTag` throws
// "Invariant: static generation store missing" when it runs outside a Next cache
// scope, and because @payloadcms/plugin-cloud-storage registers its R2 upload as an
// afterChange hook *after* this one, a throw here also skips the upload entirely.
const safeRevalidateTag = (tag: string, req: { payload: { logger: { warn: (msg: string) => void } } }) => {
  try {
    revalidateTag(tag)
  } catch (err) {
    req.payload.logger.warn(`revalidatePhoto: revalidateTag(${tag}) failed: ${String(err)}`)
  }
}

export const revalidatePhoto: CollectionAfterChangeHook = (args) => {
  if (!args.req.context.disableRevalidate) {
    safeRevalidateTag('photos-sitemap', args.req)
  }
  return args.doc
}

export const revalidateDelete: CollectionAfterDeleteHook = (args) => {
  if (!args.req.context.disableRevalidate) {
    safeRevalidateTag('photos-sitemap', args.req)
  }
  return args.doc
}
