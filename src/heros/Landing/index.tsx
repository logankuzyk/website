import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import React from 'react'

type LandingHeroProps = Page['hero'] & {
  name?: string | null
  role?: string | null
  bio?: string | null
  profileImage?: Page['hero'] extends { profileImage?: infer P } ? P : never
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  name,
  role,
  bio,
  profileImage,
}) => {
  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-4 pt-24 pb-16 md:flex-row md:gap-16 md:px-8">
      <div className="container flex flex-col items-center gap-12 md:flex-row md:items-center md:justify-center md:gap-16">
        {/* Profile image */}
        {profileImage && typeof profileImage === 'object' && (
          <div className="shrink-0">
            <div className="relative h-48 w-48 overflow-hidden border border-[var(--border-dim)] p-1 md:h-64 md:w-64">
              <Media resource={profileImage} imgClassName="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {/* Text block */}
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          {name && (
            <h1 className="font-serif text-4xl tracking-[-0.01em] text-foreground md:text-5xl lg:text-6xl">
              {name}
            </h1>
          )}
          {role && (
            <p className="mt-4 text-xl leading-[1.6] text-muted-foreground md:text-2xl">{role}</p>
          )}
          {bio && (
            <p className="mt-6 leading-[1.6] text-muted-foreground">{bio}</p>
          )}
        </div>
      </div>
    </section>
  )
}
