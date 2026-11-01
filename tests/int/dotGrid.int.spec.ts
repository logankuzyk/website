// @vitest-environment node
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Page } from '@/payload-types'

import { GET } from '@/app/(frontend)/dot-grid.svg/route'
import { BannerHero } from '@/heros/Banner'
import { dotGridSvg, dotGridUrl } from '@/heros/Banner/dotGridSvg'
import { DOT_GRID_RAMP, generateDotGrid } from '@/heros/Banner/generateDotGrid'
import { hero } from '@/heros/config'

const render = (props: Page['hero']) => renderToStaticMarkup(createElement(BannerHero, props))

const size = { width: 1440, height: 360 }
const count = (groups: ReturnType<typeof generateDotGrid>) =>
  groups.reduce((total, { dots }) => total + dots.length, 0)

describe('generateDotGrid', () => {
  it('is deterministic for a seed', () => {
    expect(generateDotGrid({ seed: 7, ...size })).toEqual(generateDotGrid({ seed: 7, ...size }))
  })

  it('gives a different pattern for a different seed', () => {
    expect(generateDotGrid({ seed: 7, ...size })).not.toEqual(generateDotGrid({ seed: 8, ...size }))
  })

  it('keeps dot spacing constant, so a bigger canvas gets more dots', () => {
    const small = count(generateDotGrid({ seed: 7, width: 400, height: 225 }))
    const large = count(generateDotGrid({ seed: 7, ...size }))
    expect(large).toBeGreaterThan(small * 4)
  })

  it('only uses ramp colours, in ramp order, and keeps every dot inside the canvas', () => {
    const groups = generateDotGrid({ seed: 7, ...size })
    const order = groups.map(({ colour }) => DOT_GRID_RAMP.indexOf(colour as never))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    for (const { dots } of groups) {
      for (const { cx, cy, r } of dots) {
        expect(cx).toBeGreaterThanOrEqual(0)
        expect(cx).toBeLessThanOrEqual(size.width)
        expect(cy).toBeGreaterThanOrEqual(0)
        expect(cy).toBeLessThanOrEqual(size.height)
        expect(r).toBeGreaterThan(0)
      }
    }
  })

  it('spreads across the ramp rather than collapsing to one colour', () => {
    expect(generateDotGrid({ seed: 7, ...size }).length).toBeGreaterThan(6)
  })
})

describe('dotGridSvg', () => {
  it('is a well-formed SVG sized to its variant, with ramp-coloured groups of circles', () => {
    const svg = dotGridSvg(7, 'desktop')
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1440 360" width="1440" height="360">/)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('<circle')
    for (const [, colour] of svg.matchAll(/<g fill="([^"]+)">/g)) {
      expect(DOT_GRID_RAMP).toContain(colour)
    }
    expect(dotGridSvg(7, 'mobile')).toContain('viewBox="0 0 400 225"')
  })

  it('keeps the large variant a reasonable size', () => {
    expect(dotGridSvg(7, 'desktop').length).toBeLessThan(150_000)
  })
})

describe('/dot-grid.svg route', () => {
  const get = (query: string) => GET(new Request(`http://localhost/dot-grid.svg?${query}`))

  it('serves the SVG for a seed and variant, cached immutably and sandboxed', async () => {
    const res = await get('seed=7&variant=desktop')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(res.headers.get('Content-Security-Policy')).toContain('sandbox')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(await res.text()).toBe(dotGridSvg(7, 'desktop'))
  })

  it('serves the URL the banner links to', async () => {
    const url = new URL(dotGridUrl(12, 'mobile'), 'http://localhost')
    const res = await get(url.searchParams.toString())
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(dotGridSvg(12, 'mobile'))
  })

  it.each([
    'variant=desktop',
    'seed=7',
    'seed=7&variant=tablet',
    'seed=abc&variant=desktop',
    'seed=1.5&variant=desktop',
    'seed=-1&variant=desktop',
    'seed=1000000&variant=desktop',
    'seed=Infinity&variant=desktop',
    'seed=7&variant=__proto__',
  ])('rejects %s', async (query) => {
    expect((await get(query)).status).toBe(400)
  })
})

describe('BannerHero dot grid background', () => {
  const dotGrid = { type: 'banner', heading: 'Projects', backgroundType: 'dotGrid' } as const

  it('links the generated SVGs through <picture>, mobile by default and desktop from md', () => {
    const html = render(dotGrid)
    expect(html).toContain('<picture>')
    expect(html).toContain(`srcSet="${dotGridUrl(7, 'desktop').replaceAll('&', '&amp;')}"`)
    expect(html).toContain('media="(min-width: 768px)"')
    expect(html).toMatch(/<img[^>]*alt=""/)
    expect(html).toContain(`src="${dotGridUrl(7, 'mobile').replaceAll('&', '&amp;')}"`)
  })

  it('keeps the dots out of the page markup', () => {
    const html = render(dotGrid)
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<circle')
  })

  it('uses the chosen seed', () => {
    const html = render({ ...dotGrid, dotGridSeed: 42 })
    expect(html).toContain('seed=42&amp;variant=desktop')
    expect(html).toContain('seed=42&amp;variant=mobile')
  })

  it('defaults the seed to 7 and the opacity to 60%', () => {
    const html = render(dotGrid)
    expect(html).toBe(render({ ...dotGrid, dotGridSeed: 7, backgroundOpacity: 60 }))
    expect(html).toContain('opacity:0.6')
  })

  it('applies the chosen opacity, including 0', () => {
    expect(render({ ...dotGrid, backgroundOpacity: 25 })).toContain('opacity:0.25')
    expect(render({ ...dotGrid, backgroundOpacity: 0 })).toContain('opacity:0')
  })

  it('keeps the heading as the page h1 over the dots', () => {
    expect(render(dotGrid)).toMatch(/<h1[^>]*>Projects<\/h1>/)
  })

  it('is not rendered for other background types', () => {
    expect(render({ type: 'banner', heading: 'x', backgroundType: 'colour', colour: 'primary' })).not.toContain('<picture')
  })
})

describe('dot grid hero fields', () => {
  type F = {
    name?: string
    min?: number
    max?: number
    defaultValue?: unknown
    validate?: (v: number | null | undefined) => true | string
    admin?: { condition?: (d: object, s: object) => boolean }
  }
  const field = (name: string) =>
    (hero as { fields: F[] }).fields.find((f) => f.name === name) as F

  it('shows the seed only for a banner with the dot grid background', () => {
    const shows = (s: object) => field('dotGridSeed').admin!.condition!({}, s)
    expect(shows({ type: 'banner', backgroundType: 'dotGrid' })).toBe(true)
    expect(shows({ type: 'banner', backgroundType: 'vector' })).toBe(false)
    expect(shows({ type: 'highImpact', backgroundType: 'dotGrid' })).toBe(false)
  })

  it('only accepts whole-number seeds', () => {
    const { validate, defaultValue } = field('dotGridSeed')
    expect(defaultValue).toBe(7)
    expect(validate!(42)).toBe(true)
    expect(validate!(null)).toBe(true)
    expect(validate!(1.5)).not.toBe(true)
  })

  it('shows opacity for vector and dot grid banners, as a 0-100 percentage', () => {
    const f = field('backgroundOpacity')
    const shows = (s: object) => f.admin!.condition!({}, s)
    expect(shows({ type: 'banner', backgroundType: 'dotGrid' })).toBe(true)
    expect(shows({ type: 'banner', backgroundType: 'vector' })).toBe(true)
    expect(shows({ type: 'banner', backgroundType: 'colour' })).toBe(false)
    expect(shows({ type: 'banner', backgroundType: 'image' })).toBe(false)
    expect([f.min, f.max]).toEqual([0, 100])
  })
})
