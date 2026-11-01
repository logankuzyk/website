import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'

import { bannerColours } from './colours'

const isResolved = <T,>(value: T | string | number | null | undefined): value is T =>
  Boolean(value) && typeof value === 'object'

export const BannerHero: React.FC<Page['hero']> = ({
  backgroundType: storedBackgroundType,
  colour,
  heading,
  media,
  vectorMedia,
}) => {
  // Same default as `heroShowsMedia`: unset (undefined or null) means image.
  const backgroundType = storedBackgroundType ?? 'image'
  const isColour = backgroundType === 'colour'
  const background = isResolved(vectorMedia) && backgroundType === 'vector' ? vectorMedia : null
  const photo = isResolved(media) && backgroundType === 'image' ? media : null

  // Dark mode only: no scrim or white heading unless there is actually a picture behind it
  // (an image or vector mode with nothing chosen falls back to the plain muted surface).
  // Light mode leaves the picture undimmed with the default dark heading.
  const overPicture = Boolean(photo ?? background)

  return (
    <div
      className={cn(
        'relative aspect-[16/9] min-h-60 w-full overflow-hidden bg-muted md:aspect-[4/1] md:max-h-[24rem]',
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
      {overPicture && (
        <div className="pointer-events-none absolute inset-0 z-[2] hidden bg-black/40 dark:block" />
      )}
      {heading && (
        <div className="absolute inset-x-0 bottom-0 z-[3]">
          {/* Same container as the page content so the heading shares its left edge */}
          <div className="container pb-6 md:pb-10">
            <h1
              className={cn(
                'max-w-[48rem] font-serif text-3xl tracking-[-0.01em] md:text-5xl lg:text-6xl',
                overPicture && 'dark:text-white',
              )}
            >
              {heading}
            </h1>
          </div>
        </div>
      )}
    </div>
  )
}
