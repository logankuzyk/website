import type { Project } from '@/payload-types'

export const MAX_VISIBLE_TAGS = 3

export type ProjectAction = {
  label: string
  href: string
  external: boolean
}

/** The first few tags for the card, and how many were left out (rendered as a `+N` chip). */
export const getVisibleTags = (
  tags: string[] | null | undefined,
  max = MAX_VISIBLE_TAGS,
): { shown: string[]; extra: number } => {
  const all = (tags ?? []).filter((tag) => tag.trim().length > 0)
  return { shown: all.slice(0, max), extra: Math.max(all.length - max, 0) }
}

/** Overlay buttons, in order. A button whose link is missing is omitted. */
export const getProjectActions = (
  project: Pick<Project, 'slug' | 'externalUrl' | 'repoUrl'>,
): ProjectAction[] => {
  const actions: ProjectAction[] = []
  if (project.externalUrl) actions.push({ label: 'View live', href: project.externalUrl, external: true })
  if (project.repoUrl) actions.push({ label: 'GitHub', href: project.repoUrl, external: true })
  actions.push({ label: 'Read more', href: `/projects/${project.slug}`, external: false })
  return actions
}
