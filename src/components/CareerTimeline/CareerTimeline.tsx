import type { Career } from '@/payload-types'

import RichText from '@/components/RichText'
import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'
import React from 'react'

function formatDate(date: string | null | undefined): string {
  if (!date) return 'now'
  const d = new Date(date)
  return d.getFullYear().toString()
}

type CareerTimelineProps = {
  entries: Career[]
}

export const CareerTimeline: React.FC<CareerTimelineProps> = ({ entries }) => {
  if (!entries?.length) {
    return (
      <p className="text-muted-foreground">No career entries yet.</p>
    )
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div
        className="absolute left-[11px] top-6 bottom-6 w-px bg-border md:left-[15px]"
        aria-hidden
      />

      <ul className="space-y-12">
        {entries.map((entry, index) => {
          const isFirst = index === 0
          const dateLabel = isFirst ? 'now' : formatDate(entry.endDate ?? entry.startDate)

          return (
            <li key={entry.id} className="relative flex gap-6 md:gap-8">
              {/* Timeline marker */}
              <div className="relative z-10 flex shrink-0 items-center justify-center">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center border-2 border-border bg-background text-[10px] font-medium md:h-8 md:w-8 md:text-xs',
                    isFirst && 'border-primary/50',
                  )}
                  aria-hidden
                >
                  {dateLabel}
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-xl tracking-tight md:text-2xl">
                      {entry.company}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {entry.jobTitle}
                    </p>
                    {entry.location && (
                      <p className="mt-1 text-sm text-muted-foreground">{entry.location}</p>
                    )}
                    <div className="mt-4 text-muted-foreground [&_.payload-richtext]:text-sm [&_.payload-richtext]:leading-relaxed">
                      <RichText data={entry.description} enableGutter={false} />
                    </div>
                  </div>

                  {/* Logo */}
                  {entry.logo && typeof entry.logo === 'object' && (
                    <div className="shrink-0">
                      <div className="h-16 w-16 overflow-hidden border border-[var(--border-dim)] p-1 md:h-20 md:w-20">
                        <Media
                          resource={entry.logo}
                          imgClassName="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
