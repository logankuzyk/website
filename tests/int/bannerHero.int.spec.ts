// @vitest-environment node
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Asset, Page, Photo } from '@/payload-types'

import { BannerHero } from '@/heros/Banner'
import { bannerColours } from '@/heros/Banner/colours'
import { hero } from '@/heros/config'
import { heroShowsMedia } from '@/heros/rules'

type HeroProps = Page['hero']

const render = (props: HeroProps) => renderToStaticMarkup(createElement(BannerHero, props))

const photo = {
  id: 'p1',
  url: '/photos/a.jpg',
  mimeType: 'image/jpeg',
  width: 2000,
  height: 1000,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as Photo

const svg = {
  id: 'a1',
  url: '/assets/bg.svg',
  mimeType: 'image/svg+xml',
  filename: 'bg.svg',
  width: 100,
  height: 50,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as Asset

describe('BannerHero', () => {
  it('renders the heading as the page h1', () => {
    const html = render({ type: 'banner', heading: 'Projects', backgroundType: 'colour', colour: 'primary' })
    expect(html).toMatch(/<h1[^>]*>Projects<\/h1>/)
  })

  it('colour mode: solid token background with its paired foreground, no scrim, no image', () => {
    const html = render({ type: 'banner', heading: 'Projects', backgroundType: 'colour', colour: 'inverse' })
    expect(html).toContain(bannerColours.inverse.className)
    expect(html).not.toContain('bg-black/')
    expect(html).not.toContain('<img')
  })

  it('image mode: renders the photo with no scrim and no forced heading colour', () => {
    const html = render({ type: 'banner', heading: 'Projects', backgroundType: 'image', media: photo })
    expect(html).toContain('<img')
    expect(html).not.toContain('bg-black/')
    expect(html).not.toContain('text-white')
  })

  it('treats a missing backgroundType as image', () => {
    expect(render({ type: 'banner', heading: 'Projects', media: photo })).toContain('<img')
  })

  it('treats a null backgroundType as image', () => {
    expect(render({ type: 'banner', heading: 'Projects', backgroundType: null, media: photo })).toContain('<img')
  })

  it('vector mode: renders the SVG with empty alt, unoptimised, at full opacity by default', () => {
    const html = render({ type: 'banner', heading: 'Projects', backgroundType: 'vector', vectorMedia: svg })
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(html).toContain('assets/bg.svg')
    expect(html).not.toContain('/_next/image')
    expect(html).not.toContain('bg-black/')
    expect(html).toContain('style="opacity:1"')
  })

  it('vector mode: applies the chosen opacity', () => {
    const html = render({
      type: 'banner',
      heading: 'Projects',
      backgroundType: 'vector',
      vectorMedia: svg,
      backgroundOpacity: 40,
    })
    expect(html).toContain('style="opacity:0.4"')
  })

  it('has no surface of its own: no muted background, scrim or forced heading colour', () => {
    for (const props of [
      { backgroundType: 'image' as const },
      { backgroundType: 'vector' as const },
      { backgroundType: 'dotGrid' as const },
    ]) {
      const html = render({ type: 'banner', heading: 'Projects', ...props })
      expect(html).not.toContain('bg-muted')
      expect(html).not.toContain('bg-black/')
      expect(html).not.toContain('text-white')
    }
  })

  it('is 4:1 on md+ and 16:9 (at least 240px tall) on mobile', () => {
    const html = render({ type: 'banner', heading: 'x', backgroundType: 'colour', colour: 'primary' })
    expect(html).toContain('md:aspect-[4/1]')
    expect(html).toMatch(/(?<![:\w-])aspect-\[16\/9\]/)
    expect(html).toContain('min-h-60')
  })

  it('renders nothing but the frame when no heading is set', () => {
    const html = render({ type: 'banner', backgroundType: 'colour', colour: 'primary' })
    expect(html).not.toContain('<h1')
  })
})

describe('bannerColours', () => {
  it('maps every token to a background and a paired foreground class', () => {
    for (const [token, { className }] of Object.entries(bannerColours)) {
      expect(className, token).toMatch(/\bbg-\S+/)
      expect(className, token).toMatch(/\btext-\S+/)
    }
  })
})

describe('hero config', () => {
  const fields = (hero as { fields: { name?: string; options?: unknown[]; validate?: unknown }[] }).fields
  const field = (name: string) => fields.find((f) => f.name === name)

  it('offers a banner type and no photo type', () => {
    const values = (field('type')!.options as { value: string }[]).map((o) => o.value)
    expect(values).toContain('banner')
    expect(values).not.toContain('photo')
  })

  it('offers image, colour, vector and dot grid backgrounds, defaulting to image', () => {
    const bg = field('backgroundType') as { defaultValue: string; options: { value: string }[] }
    expect(bg.options.map((o) => o.value)).toEqual(['image', 'colour', 'vector', 'dotGrid'])
    expect(bg.defaultValue).toBe('image')
  })

  it('lists exactly the colour tokens the component can render', () => {
    const colour = field('colour') as { options: { value: string }[] }
    expect(colour.options.map((o) => o.value).sort()).toEqual(Object.keys(bannerColours).sort())
  })

  it('uploads vectors from the assets collection', () => {
    expect(field('vectorMedia')).toMatchObject({ type: 'upload', relationTo: 'assets' })
  })
})

describe('hero media rules', () => {
  it('shows media for the impact heroes and for banner image mode only', () => {
    expect(heroShowsMedia({ type: 'highImpact' })).toBe(true)
    expect(heroShowsMedia({ type: 'mediumImpact' })).toBe(true)
    expect(heroShowsMedia({ type: 'banner', backgroundType: 'image' })).toBe(true)
    expect(heroShowsMedia({ type: 'banner' })).toBe(true)
    expect(heroShowsMedia({ type: 'banner', backgroundType: 'colour' })).toBe(false)
    expect(heroShowsMedia({ type: 'banner', backgroundType: 'vector' })).toBe(false)
    expect(heroShowsMedia({ type: 'lowImpact' })).toBe(false)
  })

  it('the media field is required, and only applies where shown (Payload skips validation otherwise)', () => {
    const media = (hero as { fields: { name?: string; required?: boolean; validate?: unknown; admin?: { condition?: Function } }[] }).fields.find(
      (f) => f.name === 'media',
    )!
    expect(media.required).toBe(true)
    expect(media.validate).toBeUndefined()
    const shows = (siblingData: object) => media.admin!.condition!({}, siblingData)
    expect(shows({ type: 'banner', backgroundType: 'vector' })).toBe(false)
    expect(shows({ type: 'banner', backgroundType: 'colour' })).toBe(false)
    expect(shows({ type: 'banner' })).toBe(true)
    expect(shows({ type: 'highImpact' })).toBe(true)
  })
})
