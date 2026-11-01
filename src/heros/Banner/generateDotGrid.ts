/**
 * Seeded "gradient field" dot grid: a lattice of dots whose size and colour follow a smooth,
 * domain-warped noise field. Pure and deterministic (same input, same output on every
 * runtime), so it can render on the server from nothing but a seed.
 *
 * Ported from the standalone `nord-dot-grid.mjs` generator. Sizes are in viewBox units, which
 * the banner maps 1:1 to CSS pixels at its design width, so dot spacing stays visually
 * constant instead of scaling with a fixed-size image.
 */

/** Dark to colourful; every stop is a colour from Nord32. */
export const DOT_GRID_RAMP = [
  '#3b4252',
  '#434c5e',
  '#486385',
  '#5e81ac',
  '#6f91b6',
  '#84b0c8',
  '#88c0d0',
  '#8bc3c6',
  '#8fbcbb',
  '#a3be8c',
  '#c7c58b',
  '#ebcb8b',
  '#dda97d',
  '#d08770',
  '#c7746d',
  '#bf616a',
  '#ba788d',
  '#b48ead',
] as const

export type Dot = { cx: number; cy: number; r: number }
export type DotGroup = { colour: string; dots: Dot[] }

export type DotGridOptions = {
  seed: number
  width: number
  height: number
  /** Distance between dot centres. */
  spacing?: number
  /** Dot radius in the darkest areas. */
  minRadius?: number
  /** Dot radius in the brightest areas. */
  maxRadius?: number
  /** How many ramp steps neighbouring dots may jitter by. */
  dither?: number
}

const LATTICE_SIZE = 256

const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t)

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Dots grouped by colour (so the SVG can set `fill` once per group), in ramp order. Colours
 * that no dot landed on are omitted.
 */
export const generateDotGrid = ({
  seed,
  width,
  height,
  spacing = 14,
  minRadius = 1.5,
  maxRadius = 5.5,
  dither = 0.9,
}: DotGridOptions): DotGroup[] => {
  const rand = mulberry32(seed)
  const lattice = Array.from({ length: LATTICE_SIZE * LATTICE_SIZE }, () => rand())

  const at = (i: number, j: number) =>
    lattice[
      (((j % LATTICE_SIZE) + LATTICE_SIZE) % LATTICE_SIZE) * LATTICE_SIZE +
        (((i % LATTICE_SIZE) + LATTICE_SIZE) % LATTICE_SIZE)
    ]!

  const valueNoise = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = smooth(x - xi)
    const yf = smooth(y - yi)
    const top = at(xi, yi) * (1 - xf) + at(xi + 1, yi) * xf
    const bottom = at(xi, yi + 1) * (1 - xf) + at(xi + 1, yi + 1) * xf
    return top * (1 - yf) + bottom * yf
  }

  const fbm = (x: number, y: number, octaves = 4) => {
    let sum = 0
    let amplitude = 0.5
    let frequency = 1
    for (let o = 0; o < octaves; o++) {
      sum += amplitude * valueNoise(x * frequency, y * frequency)
      amplitude /= 2
      frequency *= 2
    }
    return sum
  }

  // Raw field, roughly 0 (dark) to 1 (colourful). Coordinates are normalised so the same seed
  // gives the same composition at any size or aspect ratio.
  const field = (px: number, py: number) => {
    const u = px / width
    const v = py / height
    // Domain warp so the gradient flows rather than running in a straight line.
    const warpX = fbm(u * 2.2 + 11, v * 2.2 + 3) - 0.5
    const warpY = fbm(u * 2.2 + 41, v * 2.2 + 17) - 0.5
    const x = u + warpX * 0.9
    const y = v + warpY * 1.3
    // Diagonal sweep: dark at the top-left, bright toward the bottom-right.
    const sweep = x * 0.7 + y * 0.55
    const detail = fbm(u * 5 + 90, v * 5 + 60) - 0.5
    return sweep + detail * 0.12
  }

  // Rescale the raw field so it spans the whole ramp (2nd to 98th percentile).
  const samples: number[] = []
  const step = Math.max(width, height) / 120
  for (let py = 0; py <= height; py += step) {
    for (let px = 0; px <= width; px += step) samples.push(field(px, py))
  }
  samples.sort((a, b) => a - b)
  const low = samples[Math.floor(samples.length * 0.02)]!
  const high = samples[Math.floor(samples.length * 0.98)]!
  const normalised = (px: number, py: number) =>
    Math.min(1, Math.max(0, (field(px, py) - low) / (high - low)))

  const margin = spacing / 2
  const cols = Math.floor((width - margin) / spacing) + 1
  const rows = Math.floor((height - margin) / spacing) + 1
  const offsetX = (width - (cols - 1) * spacing) / 2
  const offsetY = (height - (rows - 1) * spacing) / 2

  const byColour = new Map<string, Dot[]>()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = offsetX + c * spacing
      const cy = offsetY + r * spacing
      const t = normalised(cx, cy)
      const index = t * (DOT_GRID_RAMP.length - 1) + (rand() - 0.5) * 2 * dither
      const colour =
        DOT_GRID_RAMP[Math.min(DOT_GRID_RAMP.length - 1, Math.max(0, Math.round(index)))]!
      const radius = minRadius + (maxRadius - minRadius) * Math.pow(t, 0.9)
      const dots = byColour.get(colour) ?? []
      dots.push({ cx: round1(cx), cy: round1(cy), r: round1(radius) })
      byColour.set(colour, dots)
    }
  }

  return DOT_GRID_RAMP.filter((colour) => byColour.has(colour)).map((colour) => ({
    colour,
    dots: byColour.get(colour)!,
  }))
}
