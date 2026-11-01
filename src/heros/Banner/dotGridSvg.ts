import { generateDotGrid } from './generateDotGrid'

/**
 * One rendering of a seed per banner shape (16:9 below `md`, 4:1 from `md` up), each laid out
 * at roughly the pixel size it displays at. That keeps dots the same size on every screen,
 * where a single fixed image would be cropped and magnified on mobile.
 */
export const DOT_GRID_VARIANTS = {
  mobile: { width: 400, height: 225 },
  desktop: { width: 1440, height: 360 },
} as const

export type DotGridVariant = keyof typeof DOT_GRID_VARIANTS

export const DOT_GRID_MAX_SEED = 999999

/** Bump when the generator's output changes, so cached copies of old patterns are bypassed. */
export const DOT_GRID_VERSION = 1

export const isDotGridVariant = (value: unknown): value is DotGridVariant =>
  typeof value === 'string' && Object.hasOwn(DOT_GRID_VARIANTS, value)

export const isDotGridSeed = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= DOT_GRID_MAX_SEED

export const dotGridUrl = (seed: number, variant: DotGridVariant): string =>
  `/dot-grid.svg?seed=${seed}&variant=${variant}&v=${DOT_GRID_VERSION}`

export const dotGridSvg = (seed: number, variant: DotGridVariant): string => {
  const { width, height } = DOT_GRID_VARIANTS[variant]
  const groups = generateDotGrid({ seed, width, height })
    .map(
      ({ colour, dots }) =>
        `<g fill="${colour}">${dots
          .map(({ cx, cy, r }) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`)
          .join('')}</g>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${groups}</svg>`
}
