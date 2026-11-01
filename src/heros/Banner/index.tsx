import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'

import { bannerColours } from './colours'
import { DotGridBackground } from './DotGridBackground'

const isResolved = <T,>(value: T | string | number | null | undefined): value is T =>
  Boolean(value) && typeof value === 'object'

/** Seed and opacity used when the editor has not set one (the dot grid is the busier of the two). */
export const DEFAULT_DOT_GRID_SEED = 7
export const DEFAULT_DOT_GRID_OPACITY = 60
export const DEFAULT_VECTOR_OPACITY = 100

export const BannerHero: React.FC<Page['hero']> = ({
  backgroundOpacity,
  backgroundType: storedBackgroundType,
  colour,
  dotGridSeed,
  heading,
  media,
  vectorMedia,
}) => {
  // Same default as `heroShowsMedia`: unset (undefined or null) means image.
  const backgroundType = storedBackgroundType ?? 'image'
  const isColour = backgroundType === 'colour'
  const isDotGrid = backgroundType === 'dotGrid'
  const background = isResolved(vectorMedia) && backgroundType === 'vector' ? vectorMedia : null
  const photo = isResolved(media) && backgroundType === 'image' ? media : null
  const opacity =
    (typeof backgroundOpacity === 'number'
      ? backgroundOpacity
      : isDotGrid
        ? DEFAULT_DOT_GRID_OPACITY
        : DEFAULT_VECTOR_OPACITY) / 100

  // No surface of its own, scrim or forced heading colour in either colour mode: a transparent
  // SVG shows the page background through it, and the heading keeps the page's text colour.
  return (
    <div
      className={cn(
        'relative aspect-[16/9] min-h-60 w-full overflow-hidden md:aspect-[4/1] md:max-h-[24rem]',
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
        <div className="absolute inset-0" style={{ opacity }}>
          <Media
            alt=""
            fill
            htmlElement={null}
            imgClassName="object-cover"
            priority
            resource={background}
            size="(min-width: 1536px) 1536px, 100vw"
          />
        </div>
      )}
      {isDotGrid && (
        <DotGridBackground
          opacity={opacity}
          seed={typeof dotGridSeed === 'number' ? dotGridSeed : DEFAULT_DOT_GRID_SEED}
        />
      )}
      {heading && (
        <div className="absolute inset-x-0 bottom-0 z-[3]">
          {/* Same container as the page content so the heading shares its left edge */}
          <div className="container pb-6 md:pb-10">
            <h1 className="max-w-[48rem] font-serif text-3xl tracking-[-0.01em] md:text-5xl lg:text-6xl">
              {heading}
            </h1>
          </div>
        </div>
      )}
    </div>
  )
}
