// @vitest-environment node
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Project } from '@/payload-types'

import { ProjectCard } from '@/components/ProjectsGrid/ProjectCard'
import { ProjectsGrid } from '@/components/ProjectsGrid/ProjectsGrid'
import { getProjectActions, getVisibleTags } from '@/components/ProjectsGrid/cardLinks'

const project = (overrides: Partial<Project> = {}): Project =>
  ({
    id: 'p1',
    title: 'Tabula',
    slug: 'tabula',
    description: 'A new-tab extension.',
    tags: ['Next.js', 'Payload'],
    externalUrl: 'https://tabula.example.com',
    repoUrl: 'https://github.com/logankuzyk/tabula',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  }) as Project

const render = (item: Project) => renderToStaticMarkup(createElement(ProjectCard, { project: item }))

describe('getVisibleTags', () => {
  it('shows up to three tags with no overflow chip', () => {
    expect(getVisibleTags(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b', 'c'], extra: 0 })
  })

  it('collapses the rest into a count', () => {
    expect(getVisibleTags(['a', 'b', 'c', 'd', 'e'])).toEqual({ shown: ['a', 'b', 'c'], extra: 2 })
  })

  it('tolerates a missing list and blank entries', () => {
    expect(getVisibleTags(undefined)).toEqual({ shown: [], extra: 0 })
    expect(getVisibleTags(null)).toEqual({ shown: [], extra: 0 })
    expect(getVisibleTags(['a', ' ', ''])).toEqual({ shown: ['a'], extra: 0 })
  })
})

describe('getProjectActions', () => {
  it('orders View live, GitHub, Read more', () => {
    expect(getProjectActions(project()).map((action) => action.label)).toEqual(['View live', 'GitHub', 'Read more'])
  })

  it('omits buttons whose link is missing', () => {
    expect(getProjectActions(project({ externalUrl: null })).map((action) => action.label)).toEqual([
      'GitHub',
      'Read more',
    ])
    expect(getProjectActions(project({ externalUrl: '', repoUrl: undefined })).map((action) => action.label)).toEqual([
      'Read more',
    ])
  })

  it('marks external links and points Read more at the project page', () => {
    const [live, , more] = getProjectActions(project())
    expect(live).toMatchObject({ href: 'https://tabula.example.com', external: true })
    expect(more).toMatchObject({ href: '/projects/tabula', external: false })
  })
})

describe('ProjectCard', () => {
  it('shows the title linked to the project page, the tags and the description', () => {
    const html = render(project())
    expect(html).toMatch(/<a[^>]*href="\/projects\/tabula"[^>]*>Tabula<\/a>/)
    expect(html).toContain('Next.js')
    expect(html).toContain('Payload')
    expect(html).toContain('A new-tab extension.')
    expect(html).toContain('line-clamp-2')
  })

  it('renders at most 3 tag chips plus a +N chip', () => {
    const html = render(project({ tags: ['a', 'b', 'c', 'd', 'e'] }))
    for (const tag of ['>a<', '>b<', '>c<']) expect(html).toContain(tag)
    expect(html).not.toContain('>d<')
    expect(html).toContain('+2')
  })

  it('renders the overlay buttons; external ones open safely in a new tab', () => {
    const anchor = (html: string, label: string) =>
      new RegExp(`<a\\b[^>]*>${label}</a>`).exec(html)?.[0] ?? ''
    const html = render(project())

    const live = anchor(html, 'View live')
    expect(live).toContain('href="https://tabula.example.com"')
    expect(live).toContain('target="_blank"')
    expect(live).toContain('rel="noopener noreferrer"')

    const github = anchor(html, 'GitHub')
    expect(github).toContain('href="https://github.com/logankuzyk/tabula"')
    expect(github).toContain('target="_blank"')
    expect(github).toContain('rel="noopener noreferrer"')

    const more = anchor(html, 'Read more')
    expect(more).toContain('href="/projects/tabula"')
    expect(more).not.toContain('target=')
  })

  it('has no nested anchors', () => {
    expect(render(project())).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/)
  })

  it('omits the buttons for missing links', () => {
    const html = render(project({ externalUrl: null, repoUrl: null }))
    expect(html).not.toContain('View live')
    expect(html).not.toContain('GitHub')
    expect(html).toContain('Read more')
  })

  it('stretches the title link over the card and lets overlay clicks fall through to it', () => {
    const html = render(project())
    expect(html).toMatch(/<a[^>]*class="[^"]*after:absolute after:inset-0[^"]*"[^>]*>Tabula<\/a>/)
    const overlay = /data-testid="project-card-overlay" class="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(overlay).toContain('pointer-events-none')
    expect(overlay).not.toContain('pointer-events-auto')
  })

  it('reveals the overlay on hover, focus-within and tap', () => {
    const html = render(project())
    expect(html).toContain('group-hover:opacity-100')
    expect(html).toContain('group-focus-within:opacity-100')
    expect(html).toContain('group-data-[open]:opacity-100')
  })
})

describe('ProjectsGrid', () => {
  it('renders one card per project in a 1/2/3 column grid', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectsGrid, { projects: [project(), project({ id: 'p2', slug: 'two', title: 'Two' })] }),
    )
    expect(html).toContain('sm:grid-cols-2')
    expect(html).toContain('lg:grid-cols-3')
    expect(html).toContain('>Two</a>')
  })

  it('shows an empty state', () => {
    expect(renderToStaticMarkup(createElement(ProjectsGrid, { projects: [] }))).toContain('No projects yet.')
  })
})
