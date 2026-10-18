import type { Payload, PayloadRequest, RequestContext } from 'payload'

import { isolateObjectProperty } from 'payload'

import type { Location, Photo, PhotoTag } from '@/payload-types'

import { loadStoredPhoto, toModelJpeg } from './image'
import { type AltTextHints, buildAltTextQuestion, cleanAltText } from './prompt'
import { queryImage } from './workersAI'

/**
 * Which existing alt text a run may replace:
 * - `empty`  only fill photos that have none
 * - `ai`     also replace text a previous run generated (never hand-written text)
 * - `always` replace whatever is there (an explicit "Regenerate" click)
 */
export type AltTextOverwrite = 'ai' | 'always' | 'empty'

export type AltTextResult =
  | { alt: string; status: 'generated' }
  | { reason: 'has-alt' | 'not-found'; status: 'skipped' }

const mayReplace = (
  photo: Pick<Photo, 'alt' | 'altSource'>,
  overwrite: AltTextOverwrite,
): boolean =>
  !photo.alt?.trim() || overwrite === 'always' || (overwrite === 'ai' && photo.altSource === 'ai')

type Named = Pick<Location | PhotoTag, 'id' | 'name'>
type Ref = Named | null | string | undefined

/**
 * Turn the photo's tag/location relationships into names for the prompt. Accepts ids (hook
 * data) or populated docs. Hints are a nice-to-have, so any lookup failure just drops them.
 */
export async function resolveAltTextHints(
  payload: Payload,
  { location, tags }: { location?: Ref; tags?: null | Ref[] },
  req?: PayloadRequest,
): Promise<AltTextHints> {
  try {
    const tagRefs = (tags ?? []).filter((tag): tag is Named | string => Boolean(tag))
    const tagIds = tagRefs.filter((tag): tag is string => typeof tag === 'string')
    const tagNames = tagRefs.flatMap((tag) => (typeof tag === 'string' ? [] : [tag.name]))
    if (tagIds.length) {
      const { docs } = await payload.find({
        collection: 'photo-tags',
        depth: 0,
        limit: tagIds.length,
        pagination: false,
        req,
        where: { id: { in: tagIds } },
      })
      tagNames.push(...docs.map((tag) => tag.name))
    }

    const locationDoc =
      typeof location === 'string'
        ? await payload.findByID({
            collection: 'locations',
            id: location,
            depth: 0,
            disableErrors: true,
            req,
          })
        : location

    return { location: locationDoc?.name ?? null, tags: tagNames.filter(Boolean) }
  } catch (err) {
    payload.logger.warn(`alt text: could not resolve prompt hints: ${String(err)}`)
    return {}
  }
}

/** Describe an image in any format sharp can read. Throws when the model gives nothing usable. */
export async function describeImage(image: Buffer, hints?: AltTextHints): Promise<string> {
  const answer = await queryImage({
    jpeg: await toModelJpeg(image),
    question: buildAltTextQuestion(hints),
  })
  const alt = cleanAltText(answer)
  if (!alt) throw new Error(`model answer was not usable as alt text: ${JSON.stringify(answer)}`)
  return alt
}

/**
 * Generate and save alt text for a photo that is already stored. Used by everything except
 * the upload itself (which describes the in-memory file, see `generateAltTextOnUpload`):
 * the retry task, the admin "Regenerate" endpoint and the backfill script.
 */
export async function generatePhotoAltText({
  id,
  context,
  overwrite,
  req,
}: {
  /** Extra hook context for the write, e.g. `disableRevalidate` outside a Next request. */
  context?: RequestContext
  id: string
  overwrite: AltTextOverwrite
  req: PayloadRequest
}): Promise<AltTextResult> {
  const { payload } = req

  const photo = await payload.findByID({
    collection: 'photos',
    id,
    depth: 1,
    disableErrors: true,
    req,
  })
  if (!photo) return { reason: 'not-found', status: 'skipped' }

  if (!mayReplace(photo, overwrite)) return { reason: 'has-alt', status: 'skipped' }

  const hints = await resolveAltTextHints(payload, photo, req)
  const alt = await describeImage(await loadStoredPhoto(payload, photo), hints)

  // The model call takes seconds. Look again before writing so text someone saved in the
  // meantime is not replaced.
  const current = await payload.findByID({
    collection: 'photos',
    id,
    depth: 0,
    disableErrors: true,
    req,
    select: { alt: true, altSource: true },
  })
  if (!current) return { reason: 'not-found', status: 'skipped' }
  if (!mayReplace(current, overwrite)) return { reason: 'has-alt', status: 'skipped' }

  await payload.update({
    collection: 'photos',
    id,
    // `altTextGenerated` tells `generateAltTextOnUpload` this write is ours, not a hand edit.
    context: { ...context, altTextGenerated: true },
    data: { alt, altSource: 'ai' },
    depth: 0,
    // Payload merges `context` into the req it is given, and ours is shared (the jobs of one
    // run execute in parallel on one req; the backfill reuses one). Give this write its own
    // `context` so the flag can't reach, or be cleared under, any other write.
    // Relies on the Local API default `overrideAccess: true`: field access makes `altSource`
    // read-only for everyone else.
    req: isolateObjectProperty(req, 'context'),
  })

  return { alt, status: 'generated' }
}
