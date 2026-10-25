import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'

import { bannerColours } from './colours'

const isResolved = <T,>(value: T | string | number | null | undefined): value is T =>
  Boolean(value) && typeof value === 'object'

export const BannerHero: React.FC<Page['hero']> = ({
  backgroundType = 'image',
  colour,
  heading,
  media,
  vectorMedia,
}) => {
  const isColour = backgroundType === 'colour'
  const background = isResolved(vectorMedia) && backgroundType === 'vector' ? vectorMedia : null
  const photo = isResolved(media) && backgroundType === 'image' ? media : null

  // No scrim or white heading unless there is actually a picture behind it (an image or
  // vector mode with nothing chosen falls back to the plain muted surface).
  const overPicture = Boolean(photo ?? background)

  return (
    <div className="container">
      <div
        className={cn(
          'relative aspect-[3/2] w-full overflow-hidden bg-muted md:aspect-[21/6]',
          isColour && bannerColours[colour ?? 'primary'].className,
        )}
      >
        {photo && (
          <Media
            fill
            htmlElement={null}
            imgClassName="object-cover"
            priority
            resource={photo}
            size="(min-width: 1536px) 1536px, 100vw"
          />
        )}
        {background && (
          <Media
            alt=""
            fill
            htmlElement={null}
            imgClassName="object-cover"
            priority
            resource={background}
            size="(min-width: 1536px) 1536px, 100vw"
          />
        )}
        {overPicture && <div className="pointer-events-none absolute inset-0 z-[2] bg-black/40" />}
        {heading && (
          <div className="absolute inset-x-0 bottom-0 z-[3] p-6 md:p-10">
            <h1
              className={cn(
                'max-w-[48rem] font-serif text-3xl tracking-[-0.01em] md:text-5xl lg:text-6xl',
                overPicture && 'text-white',
              )}
            >
              {heading}
            </h1>
          </div>
        )}
      </div>
    </div>
  )
}
