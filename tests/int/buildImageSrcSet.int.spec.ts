import { describe, expect, it } from 'vitest'

import type { Photo } from '@/payload-types'

import { collectImageCandidates, pickImageCandidate } from '@/utilities/buildImageSrcSet'

const photo = (overrides: Partial<Photo>): Photo =>
  ({
    id: '1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Photo

describe('collectImageCandidates', () => {
  it('returns width-preserving renditions plus the original, sorted ascending', () => {
    const result = collectImageCandidates(
      photo({
        url: '/photos/pic.webp',
        width: 4000,
        height: 3000,
        sizes: {
          thumbnail: { url: '/photos/pic-300.webp', width: 300 },
          small: { url: '/photos/pic-600.webp', width: 600 },
          medium: { url: '/photos/pic-900.webp', width: 900 },
          large: { url: '/photos/pic-1400.webp', width: 1400 },
          xlarge: { url: '/photos/pic-1920.webp', width: 1920 },
        },
      }),
    )

    expect(result).toEqual([
      { width: 300, url: '/photos/pic-300.webp' },
      { width: 600, url: '/photos/pic-600.webp' },
      { width: 900, url: '/photos/pic-900.webp' },
      { width: 1400, url: '/photos/pic-1400.webp' },
      { width: 1920, url: '/photos/pic-1920.webp' },
      { width: 4000, url: '/photos/pic.webp' },
    ])
  })

  it('excludes cropped renditions (square, og)', () => {
    const result = collectImageCandidates(
      photo({
        url: '/photos/pic.webp',
        width: 2000,
        sizes: {
          thumbnail: { url: '/photos/pic-300.webp', width: 300 },
          square: { url: '/photos/pic-500sq.webp', width: 500, height: 500 },
          og: { url: '/photos/pic-og.jpg', width: 1200, height: 630 },
        },
      }),
    )

    expect(result.map((c) => c.url)).toEqual(['/photos/pic-300.webp', '/photos/pic.webp'])
  })

  it('tolerates a sparse ladder (Payload skips sizes larger than the source)', () => {
    const result = collectImageCandidates(
      photo({
        url: '/photos/small.webp',
        width: 500,
        sizes: {
          thumbnail: { url: '/photos/small-300.webp', width: 300 },
          small: { url: null, width: null },
          medium: undefined,
        },
      }),
    )

    expect(result).toEqual([
      { width: 300, url: '/photos/small-300.webp' },
      { width: 500, url: '/photos/small.webp' },
    ])
  })

  it('does not duplicate a width when a rendition matches the original', () => {
    const result = collectImageCandidates(
      photo({
        url: '/photos/pic.webp',
        width: 1920,
        sizes: { xlarge: { url: '/photos/pic-1920.webp', width: 1920 } },
      }),
    )

    expect(result).toEqual([{ width: 1920, url: '/photos/pic-1920.webp' }])
  })

  it('returns nothing usable when there is no url or width', () => {
    expect(collectImageCandidates(photo({ sizes: {} }))).toEqual([])
  })
})

describe('pickImageCandidate', () => {
  const candidates = [
    { width: 300, url: 'a' },
    { width: 900, url: 'b' },
    { width: 1920, url: 'c' },
  ]

  it('picks the smallest candidate that covers the requested width', () => {
    expect(pickImageCandidate(candidates, 280)).toBe('a')
    expect(pickImageCandidate(candidates, 300)).toBe('a')
    expect(pickImageCandidate(candidates, 301)).toBe('b')
    expect(pickImageCandidate(candidates, 900)).toBe('b')
  })

  it('falls back to the largest candidate when none is wide enough', () => {
    expect(pickImageCandidate(candidates, 4000)).toBe('c')
  })

  it('returns undefined for an empty ladder', () => {
    expect(pickImageCandidate([], 500)).toBeUndefined()
  })
})
