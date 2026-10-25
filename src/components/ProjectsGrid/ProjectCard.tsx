import type { Project } from '@/payload-types'

import { Media } from '@/components/Media'
import Link from 'next/link'
import React from 'react'

import { getProjectActions, getVisibleTags } from './cardLinks'
import { TapRevealCard } from './TapRevealCard'

const chip = 'border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground'
const actionButton =
  'block border border-white/80 px-3 py-1.5 text-center text-sm text-white transition-colors hover:bg-white hover:text-black'

export const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  const { shown, extra } = getVisibleTags(project.tags)

  return (
    <TapRevealCard
      overlay={
        <div
          data-testid="project-card-overlay"
          className={
            'pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity duration-200 ' +
            'group-hover:pointer-events-auto group-hover:opacity-100 ' +
            'group-focus-within:pointer-events-auto group-focus-within:opacity-100 ' +
            'group-data-[open]:pointer-events-auto group-data-[open]:opacity-100'
          }
        >
          <div className="flex w-40 flex-col gap-2">
            {getProjectActions(project).map(({ label, href, external }) =>
              external ? (
                <a
                  key={label}
                  className={actionButton}
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {label}
                </a>
              ) : (
                <Link key={label} className={actionButton} href={href}>
                  {label}
                </Link>
              ),
            )}
          </div>
        </div>
      }
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {project.featuredImage && typeof project.featuredImage === 'object' && (
          <Media
            resource={project.featuredImage}
            imgClassName="h-full w-full object-cover"
            size="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-lg tracking-tight">
            <Link href={`/projects/${project.slug}`}>{project.title}</Link>
          </h2>
          {shown.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {shown.map((tag) => (
                <span key={tag} className={chip}>
                  {tag}
                </span>
              ))}
              {extra > 0 && <span className={chip}>+{extra}</span>}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      </div>
    </TapRevealCard>
  )
}
