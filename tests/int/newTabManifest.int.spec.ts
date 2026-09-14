import { describe, expect, it } from 'vitest'

import type { Location, Photo } from '@/payload-types'

import { buildNewTabManifest, toIsoDate } from '@/utilities/buildNewTabManifest'

const SITE_URL = 'https://logankuzyk.com'
const MEDIA = 'https://media.logankuzyk.com/photos/abc'

const location = (name: string, parent?: Location): Location =>
  ({ id: name, name, slug: name, parent, updatedAt: '', createdAt: '' }) as Location

const photo = (overrides: Partial<Photo> = {}): Photo =>
  ({
    id: 'p1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    url: `${MEDIA}/pic.jpg`,
    width: 6000,
    height: 4000,
    focalX: 30,
    focalY: 60,
    alt: 'Sunset over the Olympics',
    sizes: {
      thumbnail: { url: `${MEDIA}/pic-300.webp`, width: 300 },
      square: { url: `${MEDIA}/pic-500x500.webp`, width: 500, height: 500 },
      small: { url: `${MEDIA}/pic-600.webp`, width: 600 },
      medium: { url: `${MEDIA}/pic-900.webp`, width: 900 },
      large: { url: `${MEDIA}/pic-1400.webp`, width: 1400 },
      xlarge: { url: `${MEDIA}/pic-1920.webp`, width: 1920 },
      og: { url: `${MEDIA}/pic-og.jpg`, width: 1200, height: 630 },
    },
    exif: {
      Make: 'Canon',
      Model: 'Canon EOS R5',
      FocalLength: '35',
      FNumber: '2.8',
      ExposureTime: '0.004',
      ISO: '400',
      DateTimeOriginal: '1751286361',
    },
    location: location('Victoria', location('British Columbia', location('Canada'))),
    ...overrides,
  }) as Photo

const build = (photos: Photo[], slugs: [string, string][] = []) =>
  buildNewTabManifest({
    photos,
    collectionSlugByPhotoId: new Map(slugs),
    siteUrl: SITE_URL,
    basePath: '/photography',
    now: new Date('2026-09-11T12:00:00.000Z'),
  })

describe('buildNewTabManifest', () => {
  it('builds a v1 manifest entry', () => {
    expect(build([photo()], [['p1', 'coast']])).toEqual({
      version: 1,
      generatedAt: '2026-09-11T12:00:00.000Z',
      photos: [
        {
          id: 'p1',
          alt: 'Sunset over the Olympics',
          width: 6000,
          height: 4000,
          focalX: 30,
          focalY: 60,
          sizes: [
            { url: `${MEDIA}/pic-300.webp`, width: 300 },
            { url: `${MEDIA}/pic-600.webp`, width: 600 },
            { url: `${MEDIA}/pic-900.webp`, width: 900 },
            { url: `${MEDIA}/pic-1400.webp`, width: 1400 },
            { url: `${MEDIA}/pic-1920.webp`, width: 1920 },
          ],
          exif: {
            camera: 'Canon, EOS R5',
            focalLength: '35.0mm',
            aperture: 'f/2.8',
            shutter: '1/250s',
            iso: 'ISO 400',
            dateTaken: '2025-06-30T12:26:01.000Z',
          },
          location: 'Victoria, British Columbia, Canada',
          pageUrl: 'https://logankuzyk.com/photography/coast?photo=p1',
          printUrl: null,
        },
      ],
    })
  })

  it('skips missing sizes and never includes the cropped or original renditions', () => {
    const [entry] = build([
      photo({
        width: 1000,
        sizes: {
          thumbnail: { url: `${MEDIA}/pic-300.webp`, width: 300 },
          square: { url: `${MEDIA}/pic-500x500.webp`, width: 500, height: 500 },
          small: { url: null, width: null },
          medium: { url: `${MEDIA}/pic-900.webp`, width: 900 },
        },
      }),
    ]).photos

    expect(entry?.sizes).toEqual([
      { url: `${MEDIA}/pic-300.webp`, width: 300 },
      { url: `${MEDIA}/pic-900.webp`, width: 900 },
    ])
  })

  it('makes relative rendition URLs absolute', () => {
    const [entry] = build([
      photo({ sizes: { thumbnail: { url: '/photos/pic-300.webp', width: 300 } } }),
    ]).photos

    expect(entry?.sizes).toEqual([{ url: `${SITE_URL}/photos/pic-300.webp`, width: 300 }])
  })

  it('drops photos without dimensions or any usable rendition', () => {
    const manifest = build([
      photo({ id: 'no-dims', width: null, height: null }),
      photo({ id: 'no-sizes', url: null, sizes: {} }),
      photo({ id: 'ok' }),
    ])

    expect(manifest.photos.map((p) => p.id)).toEqual(['ok'])
  })

  it('returns empty EXIF when there is none', () => {
    const [entry] = build([photo({ exif: undefined })]).photos
    expect(entry?.exif).toEqual({})
  })

  it('only includes the EXIF fields that are present', () => {
    const [entry] = build([photo({ exif: { Model: 'X-T5', FNumber: '5.6', ISO: '' } })]).photos
    expect(entry?.exif).toEqual({ camera: 'X-T5', aperture: 'f/5.6' })
  })

  it('falls back to the photography index when no visible collection contains the photo', () => {
    const manifest = build([photo({ id: 'a' }), photo({ id: 'b' })], [['a', 'coast']])

    expect(manifest.photos.map((p) => p.pageUrl)).toEqual([
      'https://logankuzyk.com/photography/coast?photo=a',
      'https://logankuzyk.com/photography',
    ])
  })

  it('always sets printUrl to null', () => {
    expect(build([photo()]).photos[0]?.printUrl).toBeNull()
  })

  it('normalizes blank alt text and unpopulated locations to null', () => {
    const [entry] = build([photo({ alt: '  ', location: 'loc-id', focalX: null })]).photos

    expect(entry).toMatchObject({ alt: null, location: null, focalX: null })
  })
})

describe('toIsoDate', () => {
  it('converts Unix seconds', () => {
    expect(toIsoDate('1751286361')).toBe('2025-06-30T12:26:01.000Z')
  })

  it('converts raw EXIF dates, treating them as UTC', () => {
    expect(toIsoDate('2024:06:30 18:05:09')).toBe('2024-06-30T18:05:09.000Z')
  })

  it('passes through parseable date strings', () => {
    expect(toIsoDate('2024-06-30T18:05:09.000Z')).toBe('2024-06-30T18:05:09.000Z')
  })

  it('returns undefined for missing or unparseable values', () => {
    expect(toIsoDate(null)).toBeUndefined()
    expect(toIsoDate('')).toBeUndefined()
    expect(toIsoDate('not a date')).toBeUndefined()
  })
})
