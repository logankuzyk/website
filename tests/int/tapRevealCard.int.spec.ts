// @vitest-environment jsdom
import { Fragment, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TapRevealCard } from '@/components/ProjectsGrid/TapRevealCard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const card = (id: string) =>
  // eslint-disable-next-line react/no-children-prop -- the component requires `children` in its props type
  createElement(TapRevealCard, {
    overlay: createElement('a', { href: `#${id}-overlay`, id: `${id}-overlay` }, 'Read more'),
    children: createElement(
      Fragment,
      null,
      createElement('a', { href: `#${id}`, id }, 'Title'),
      createElement('p', { id: `${id}-text` }, 'text'),
    ),
  })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(createElement('div', null, createElement(Fragment, { key: 'a' }, card('a')), createElement(Fragment, { key: 'b' }, card('b')))))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const element = (id: string) => container.querySelector<HTMLElement>(`#${id}`)!
const cardOf = (id: string) => element(id).closest<HTMLElement>('[data-testid="project-card"]')!

const pointerdown = (target: Element, pointerType: string) =>
  act(() => {
    const event = new Event('pointerdown', { bubbles: true })
    Object.assign(event, { pointerType })
    target.dispatchEvent(event)
  })

/** Dispatches a click; returns true when it was NOT prevented (i.e. the link would navigate). */
const click = (target: Element, detail = 1) => {
  let proceeded = true
  act(() => {
    proceeded = target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
  })
  return proceeded
}

const tap = (target: Element) => {
  pointerdown(target, 'touch')
  return click(target)
}

describe('TapRevealCard', () => {
  it('swallows the first touch tap and opens the card', () => {
    expect(tap(element('a'))).toBe(false)
    expect(cardOf('a').dataset.open).toBe('true')
  })

  it('lets a second tap on a link through', () => {
    tap(element('a'))
    expect(tap(element('a-overlay'))).toBe(true)
    expect(cardOf('a').dataset.open).toBe('true')
  })

  it('closes on a tap off a link', () => {
    tap(element('a'))
    expect(tap(element('a-text'))).toBe(true)
    expect(cardOf('a').dataset.open).toBeUndefined()
  })

  it('closes when another card, or anywhere else, is touched', () => {
    tap(element('a'))
    tap(element('b'))
    expect(cardOf('a').dataset.open).toBeUndefined()
    expect(cardOf('b').dataset.open).toBe('true')

    pointerdown(document.body, 'touch')
    expect(cardOf('b').dataset.open).toBeUndefined()
  })

  it('never treats a mouse click as a tap', () => {
    pointerdown(element('a'), 'mouse')
    expect(click(element('a'))).toBe(true)
    expect(cardOf('a').dataset.open).toBeUndefined()
  })

  it('does not swallow keyboard activation after an earlier touch (stale pointer type)', () => {
    pointerdown(element('b'), 'touch') // a touch scroll: pointerdown, no click
    expect(click(element('b'), 0)).toBe(true) // Enter on a focused link: detail 0
    expect(cardOf('b').dataset.open).toBeUndefined()
  })

  it('forgets the touch pointer after the click it belonged to', () => {
    tap(element('a')) // opens
    // Keyboard click with no new pointerdown must go through even though the last pointer was touch.
    expect(click(element('a-overlay'), 0)).toBe(true)
  })
})
