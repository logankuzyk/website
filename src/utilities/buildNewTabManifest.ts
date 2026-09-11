import type { Photo } from '@/payload-types'

import { collectImageCandidates } from './buildImageSrcSet'
import {
  formatAperture,
  formatCamera,
  formatFocalLength,
  formatIso,
  formatShutterSpeed,
} from './formatExif'
import { formatLocation } from './formatLocation'
import { getPhotoImageUrl } from './getPhotoImageUrl'

/**
 * Manifest v1 served at /new-tab/photos.json for the new tab browser extension
 * (github.com/logankuzyk/ntp). The extension validates this shape, so any breaking change
 * needs a new `version`.
 */
export type NewTabExif = {
  camera?: string
  focalLength?: string
  aperture?: string
  shutter?: string
  iso?: string
  /** ISO 8601. Formatted in the viewer's locale by the extension. */
  dateTaken?: string
}

export type NewTabPhoto = {
  id: string
  alt: string | null
  width: number
  height: number
  focalX: number | null
  focalY: number | null
  /** Aspect-preserving renditions, ascending by width. Sparse: small originals skip sizes. */
  sizes: { url: string; width: number }[]
  exif: NewTabExif
  location: string | null
  pageUrl: string
  printUrl: string | null
}

export type NewTabManifest = {
  version: 1
  generatedAt: string
  photos: NewTabPhoto[]
}

export type BuildNewTabManifestArgs = {
  photos: Photo[]
  /** First visible collection (by displayOrder) each photo belongs to. */
  collectionSlugByPhotoId: Map<string, string>
  siteUrl: string
  basePath: string
  now?: Date
}

/**
 * Normalize an EXIF date to ISO 8601. payload-exif stores `DateTimeOriginal` as a string that
 * may be Unix seconds, raw EXIF ("2024:06:30 18:05:09", no zone — treated as UTC) or a
 * parseable date string. Returns undefined when it can't be parsed.
 */
export function toIsoDate(value: string | null | undefined): string | undefined {
  const str = value?.trim()
  if (!str) return undefined

  let date: Date
  const exif = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(str)
  if (/^\d{9,11}$/.test(str)) {
    date = new Date(Number(str) * 1000)
  } else if (exif) {
    const [, y, m, d, h, min, s] = exif
    date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`)
  } else {
    date = new Date(str)
  }

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function buildExif(exif: Photo['exif']): NewTabExif {
  if (!exif) return {}

  const entries: [keyof NewTabExif, string | undefined][] = [
    ['camera', formatCamera(exif.Make, exif.Model)],
    ['focalLength', formatFocalLength(exif.FocalLength)],
    ['aperture', formatAperture(exif.FNumber)],
    ['shutter', formatShutterSpeed(exif.ExposureTime)],
    ['iso', formatIso(exif.ISO)],
    ['dateTaken', toIsoDate(exif.DateTimeOriginal ?? exif.CreateDate)],
  ]

  return Object.fromEntries(entries.filter(([, value]) => Boolean(value))) as NewTabExif
}

function buildPhoto(
  photo: Photo,
  { collectionSlugByPhotoId, siteUrl, basePath }: BuildNewTabManifestArgs,
): NewTabPhoto | null {
  if (!photo.width || !photo.height) return null

  const sizes = collectImageCandidates(photo)
    .map(({ url, width }) => ({ url: getPhotoImageUrl({ url }, siteUrl), width }))
    .filter((size): size is { url: string; width: number } => size.url !== null)
  if (sizes.length === 0) return null

  const slug = collectionSlugByPhotoId.get(photo.id)

  return {
    id: photo.id,
    alt: photo.alt?.trim() || null,
    width: photo.width,
    height: photo.height,
    focalX: photo.focalX ?? null,
    focalY: photo.focalY ?? null,
    sizes,
    exif: buildExif(photo.exif),
    location: formatLocation(photo.location),
    pageUrl: slug
      ? `${siteUrl}${basePath}/${slug}?photo=${encodeURIComponent(photo.id)}`
      : `${siteUrl}${basePath}`,
    printUrl: null,
  }
}

/**
 * Pure builder for the new tab manifest. Querying (photos, collection membership, base path)
 * happens in the route so this stays unit-testable. Photos without dimensions or any usable
 * rendition are dropped.
 */
export function buildNewTabManifest(args: BuildNewTabManifestArgs): NewTabManifest {
  return {
    version: 1,
    generatedAt: (args.now ?? new Date()).toISOString(),
    photos: args.photos
      .map((photo) => buildPhoto(photo, args))
      .filter((photo): photo is NewTabPhoto => photo !== null),
  }
}
