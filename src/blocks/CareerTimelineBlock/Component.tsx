import type { Career } from '@/payload-types'

import { CareerTimeline } from '@/components/CareerTimeline/CareerTimeline'
import { Separator } from '@/components/Separator/Separator'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

type CareerTimelineBlockProps = {
  title?: string | null
  id?: string
}

export const CareerTimelineBlock: React.FC<CareerTimelineBlockProps> = async (props) => {
  const { title, id } = props

  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'career',
    depth: 2,
    limit: 100,
    overrideAccess: false,
    sort: '-startDate',
    where: { _status: { equals: 'published' } },
  })

  const entries = docs as Career[]
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
      <CareerTimeline entries={entries} />
    </div>
  )
}
