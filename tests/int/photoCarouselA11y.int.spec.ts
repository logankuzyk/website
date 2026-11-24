import { createElement } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Photo } from '@/payload-types'

import { PhotoCarousel } from '@/components/PhotoCarousel/PhotoCarousel'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource: Photo }) =>
    createElement('img', { src: resource.url ?? '', alt: resource.alt ?? '' }),
}))

// RichText pulls in Payload admin UI (scss) which vitest can't load; captions aren't under test.
vi.mock('@/components/RichText', () => ({ default: () => null }))

const photos = [1, 2, 3].map(
  (num) =>
    ({
      id: `p${num}`,
      url: `/photos/${num}.jpg`,
      alt: `Photo ${num} alt`,
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    }) as Photo,
)

let root: Root | null = null
let container: HTMLElement | null = null

const setup = (props: Partial<React.ComponentProps<typeof PhotoCarousel>> = {}) => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      createElement(PhotoCarousel, { photos, initialIndex: 0, onClose: vi.fn(), ...props }),
    )
  })
}

const byLabel = (label: string) =>
  Array.from(document.querySelectorAll(`[aria-label="${label}"]`)) as HTMLElement[]
const click = (element: HTMLElement) => act(() => element.click())
const slideInert = () =>
  Array.from(document.querySelectorAll('[aria-roledescription="slide"]')).map((slide) =>
    slide.hasAttribute('inert'),
  )

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
})

describe('PhotoCarousel accessibility', () => {
  it('renders as a native dialog', () => {
    setup()
    expect(document.querySelector('dialog')).not.toBeNull()
  })

  it('exposes only the current slide to assistive tech', () => {
    setup()
    expect(slideInert()).toEqual([false, true, true])
  })

  it('moves the exposed slide and announces it when navigating', () => {
    setup()
    click(byLabel('Next photo')[0])
    expect(slideInert()).toEqual([true, false, true])
    expect(document.querySelector('[role="status"]')!.textContent).toBe('Photo 2 of 3: Photo 2 alt')
  })

  it('never aria-hides the controls, even after the UI auto-hides', () => {
    vi.useFakeTimers()
    setup()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(document.querySelector('[aria-hidden="true"] button')).toBeNull()
    expect(byLabel('Next photo')).toHaveLength(1)
  })

  it('keeps the closed info drawer out of the tab order', () => {
    setup()
    const toggle = byLabel('Open info')[0]
    const content = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(content.hasAttribute('inert')).toBe(true)
    click(toggle)
    expect(content.hasAttribute('inert')).toBe(false)
  })

  it('has a single close button (no duplicate backdrop button)', () => {
    setup()
    expect(byLabel('Close carousel')).toHaveLength(1)
  })

  it('closes the drawer before the carousel on Escape', () => {
    const onClose = vi.fn()
    setup({ onClose })
    const dialog = document.querySelector('dialog')!
    const cancel = () => act(() => void dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
    click(byLabel('Open info')[0])
    cancel()
    expect(onClose).not.toHaveBeenCalled()
    cancel()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
