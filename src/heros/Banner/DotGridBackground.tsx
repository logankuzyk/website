import React from 'react'

import { dotGridUrl } from './dotGridSvg'

type DotGridBackgroundProps = {
  seed: number
  /** 0 (invisible) to 1 (full colour). */
  opacity: number
}

/**
 * The pattern is generated on the server from the seed and served as a long-cached SVG
 * (see `app/(frontend)/dot-grid.svg`), so it stays out of the page's HTML. `<picture>` makes
 * the browser fetch only the variant that matches the banner's shape at this breakpoint.
 */
export const DotGridBackground: React.FC<DotGridBackgroundProps> = ({ seed, opacity }) => (
  <picture>
    <source media="(min-width: 768px)" srcSet={dotGridUrl(seed, 'desktop')} />
    <img
      alt=""
      className="pointer-events-none absolute inset-0 size-full object-cover"
      decoding="async"
      fetchPriority="high"
      src={dotGridUrl(seed, 'mobile')}
      style={{ opacity }}
    />
  </picture>
)
