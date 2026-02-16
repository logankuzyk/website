import type { Project } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

type ProjectsGridProps = {
  projects: Project[]
}

export const ProjectsGrid: React.FC<ProjectsGridProps> = ({ projects }) => {
  if (!projects?.length) {
    return (
      <p className="text-muted-foreground">No projects yet.</p>
    )
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.slug}`}
          className={cn(
            'group flex flex-col overflow-hidden rounded-lg border border-border bg-card',
            'transition-shadow duration-200 hover:border-foreground/20 hover:shadow-md',
          )}
        >
          {/* Thumbnail - fixed aspect ratio */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {project.featuredImage && typeof project.featuredImage === 'object' && (
              <Media
                resource={project.featuredImage}
                imgClassName="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-6">
            <h2 className="text-lg font-semibold tracking-tight">{project.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
