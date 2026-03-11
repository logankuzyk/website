import type { Project } from '@/payload-types'

import { ProjectsGrid } from '@/components/ProjectsGrid/ProjectsGrid'
import { Separator } from '@/components/Separator/Separator'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

type ProjectsGridBlockProps = {
  title?: string | null
  limit?: number | null
  id?: string
}

export const ProjectsGridBlock: React.FC<ProjectsGridBlockProps> = async (props) => {
  const { title, limit, id } = props

  const payload = await getPayload({ config: configPromise })

  const fetchLimit = limit != null && limit > 0 ? limit : 100
  const { docs } = await payload.find({
    collection: 'projects',
    depth: 2,
    limit: fetchLimit,
    overrideAccess: false,
    sort: 'displayOrder',
    where: { _status: { equals: 'published' } },
  })

  const projects = docs as Project[]
  const hasTitle = title && title.trim().length > 0

  return (
    <div className="container pt-8" id={id ? `block-${id}` : undefined}>
      {hasTitle && (
        <header className="mb-16">
          <h2 className="font-serif text-4xl tracking-[-0.01em] text-foreground md:text-5xl">
            {title}
          </h2>
          <Separator />
        </header>
      )}
      <ProjectsGrid projects={projects} />
    </div>
  )
}
