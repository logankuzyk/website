import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import React from 'react'

type LandingHeroProps = Page['hero'] & {
  name?: string | null
  role?: string | null
  bio?: string | null
  profileImage?: Page['hero'] extends { profileImage?: infer P } ? P : never
  scrollLink?: Page['hero'] extends { scrollLink?: infer S } ? S : never
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  name,
  role,
  bio,
  profileImage,
  scrollLink,
}) => {
  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-4 pt-24 pb-16 md:flex-row md:gap-16 md:px-8">
      <div className="container flex flex-col items-center gap-12 md:flex-row md:items-center md:justify-center md:gap-16">
        {/* Profile image */}
        {profileImage && typeof profileImage === 'object' && (
          <div className="shrink-0">
            <div className="relative h-48 w-48 overflow-hidden rounded-lg border border-border md:h-64 md:w-64">
              <Media resource={profileImage} imgClassName="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* Text block */}
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          {name && (
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
              {name}
            </h1>
          )}
          {role && <p className="mt-4 text-xl text-muted-foreground md:text-2xl">{role}</p>}
          {bio && <p className="mt-6 text-muted-foreground leading-relaxed">{bio}</p>}
        </div>
      </div>

      {/* Scroll indicator */}
      {scrollLink &&
        (scrollLink.url ||
          (typeof scrollLink.reference?.value === 'object' &&
            scrollLink.reference?.value?.slug)) && (
          <div className="mt-auto flex flex-col items-center gap-2 pt-12">
            <CMSLink
              {...scrollLink}
              label={null}
              appearance="inline"
              className="flex flex-col items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{scrollLink.label || 'Scroll'}</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </CMSLink>
          </div>
        )}
    </section>
  )
}
