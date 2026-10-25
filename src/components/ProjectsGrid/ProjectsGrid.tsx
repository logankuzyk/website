import type { Project } from '@/payload-types'

import React from 'react'

import { ProjectCard } from './ProjectCard'

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
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
