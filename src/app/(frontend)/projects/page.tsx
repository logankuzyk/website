import type { Metadata } from 'next'

import { ProjectsGrid } from '@/components/ProjectsGrid/ProjectsGrid'
import { Separator } from '@/components/Separator/Separator'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'
export const revalidate = 600

export default async function ProjectsPage() {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'projects',
    depth: 2,
    limit: 100,
    overrideAccess: false,
    sort: 'displayOrder',
    where: {
      _status: { equals: 'published' },
    },
  })

  return (
    <article className="pt-24 pb-24">
      <div className="container">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Projects</h1>
          <Separator />
          <p className="mt-6 max-w-2xl text-muted-foreground">
            A selection of projects I&apos;ve worked on. Click any card to view details.
          </p>
        </header>

        <ProjectsGrid projects={docs} />
      </div>
    </article>
  )
}

export const metadata: Metadata = {
  title: 'Projects',
  description: 'A selection of projects and work',
}
