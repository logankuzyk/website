import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'

type Args = {
  params: Promise<{ slug?: string }>
}

// force-dynamic: build runs without MongoDB; pages render at request time
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const projects = await payload.find({
      collection: 'projects',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true },
      where: { _status: { equals: 'published' } },
    })

    return projects.docs.map(({ slug }) => ({ slug }))
  } catch {
    // MongoDB not available during build (e.g. Docker build). Pages will be generated on-demand at runtime.
    return []
  }
}

export default async function ProjectDetailPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = `/projects/${decodedSlug}`
  const project = await queryProjectBySlug({ slug: decodedSlug })

  if (!project) return <PayloadRedirects url={url} />

  return (
    <article className="pt-24 pb-24">
      <PayloadRedirects disableNotFound url={url} />

      <div className="container">
        <header className="mb-12 max-w-3xl">
          <h1 className="font-serif text-4xl tracking-[-0.01em] text-foreground md:text-5xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-4 text-lg leading-[1.6] text-muted-foreground">{project.description}</p>
          )}
        </header>

        <div className="max-w-3xl">
          <RichText data={project.content} enableGutter={false} />
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const project = await queryProjectBySlug({ slug: decodedSlug })

  if (!project) {
    return { title: 'Project not found' }
  }

  return {
    title: project.title,
    description: project.description,
  }
}

const queryProjectBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'projects',
    draft: false,
    depth: 2,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: { equals: slug },
      _status: { equals: 'published' },
    },
  })

  return result.docs?.[0] ?? null
})
