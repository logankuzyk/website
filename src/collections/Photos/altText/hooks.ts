import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import type { Photo } from '@/payload-types'

import { describeImage, resolveAltTextHints } from './generate'
import { PREFERRED_SIZES } from './image'
import { ALT_TEXT_QUEUE, ALT_TEXT_TASK } from './task'
import { isAltTextConfigured, WorkersAIUnavailableError } from './workersAI'

// After Workers AI itself fails, skip the inline attempt for a while and go straight to the
// retry queue, so an outage doesn't add a timeout to every file of a bulk upload.
const INLINE_COOLDOWN_MS = 2 * 60_000
let inlineDisabledUntil = 0

// Give the upload (and its R2 write, which runs in a later afterChange hook) time to finish
// before the retry task goes looking for the stored file.
const RETRY_DELAY_MS = 60_000

/**
 * Keeps `alt` / `altSource` consistent on every write, and on upload fills a blank `alt` from
 * the vision model.
 *
 * The upload is described inline, from the rendition Payload has just generated in memory,
 * rather than from a queued job. That way the alt text is part of the create itself: the edit
 * form the admin lands on already holds it (a job finishing later would be overwritten by the
 * next save of that stale form), and the create's own `revalidatePhoto` covers it. Only when
 * the inline attempt fails does `queueAltTextRetry` hand the photo to the jobs queue.
 */
export const generateAltTextOnUpload: CollectionBeforeChangeHook<Photo> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  // `generatePhotoAltText` wrote this and set `altSource` itself.
  if (req.context.altTextGenerated) return data

  const alt = typeof data.alt === 'string' ? data.alt.trim() : ''

  if (operation === 'update') {
    if ('alt' in data && alt !== (originalDoc?.alt ?? '').trim()) {
      data.altSource = alt ? 'manual' : null
    }
    return data
  }

  // A duplicate arrives with its source's text (`originalDoc` is the source); keep that
  // text's provenance instead of calling a copied AI description hand-written.
  const copied = alt !== '' && alt === (originalDoc?.alt ?? '').trim()
  data.altSource = copied ? (originalDoc?.altSource ?? null) : alt ? 'manual' : null
  if (alt || !isAltTextConfigured()) return data

  const sizes = req.payloadUploadSizes ?? {}
  const image =
    PREFERRED_SIZES.map((size) => sizes[size]).find((buffer) => buffer?.length) ?? req.file?.data

  if (image?.length && Date.now() >= inlineDisabledUntil) {
    try {
      const hints = await resolveAltTextHints(req.payload, data, req)
      data.alt = await describeImage(image, hints)
      data.altSource = 'ai'
      return data
    } catch (err) {
      if (err instanceof WorkersAIUnavailableError) {
        inlineDisabledUntil = Date.now() + INLINE_COOLDOWN_MS
      }
      req.payload.logger.warn(
        `alt text: generation failed during upload, queueing a retry: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // No usable bytes, in cooldown, or the attempt failed. Set on `req.context`, not a `context`
  // captured earlier: every nested Local API call above replaces `req.context` with a new
  // object, and the afterChange hook is handed the current one.
  req.context.altTextPending = true
  return data
}

/** Hands a photo whose inline generation didn't happen to the jobs queue. */
export const queueAltTextRetry: CollectionAfterChangeHook<Photo> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create' || !req.context.altTextPending) return doc
  // One-shot: a `req` reused for several creates (the seed, import scripts) must not queue a
  // job for every later photo.
  delete req.context.altTextPending

  // Never throw from here: @payloadcms/plugin-cloud-storage registers the R2 upload as a later
  // afterChange hook, so a throw would leave the document without its files.
  try {
    await req.payload.jobs.queue({
      input: { photoId: String(doc.id) },
      queue: ALT_TEXT_QUEUE,
      req,
      task: ALT_TEXT_TASK,
      waitUntil: new Date(Date.now() + RETRY_DELAY_MS),
    })
  } catch (err) {
    req.payload.logger.error(
      `alt text: could not queue a retry for photo ${doc.id}: ${String(err)}`,
    )
  }

  return doc
}
