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
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (ratio: number) => ratio * ratio * (3 - 2 * ratio)

const round1 = (value: number) => Math.round(value * 10) / 10

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

  const latticeAt = (col: number, row: number) =>
    lattice[
      (((row % LATTICE_SIZE) + LATTICE_SIZE) % LATTICE_SIZE) * LATTICE_SIZE +
        (((col % LATTICE_SIZE) + LATTICE_SIZE) % LATTICE_SIZE)
    ]!

  const valueNoise = (posX: number, posY: number) => {
    const cellX = Math.floor(posX)
    const cellY = Math.floor(posY)
    const fracX = smooth(posX - cellX)
    const fracY = smooth(posY - cellY)
    const top = latticeAt(cellX, cellY) * (1 - fracX) + latticeAt(cellX + 1, cellY) * fracX
    const bottom =
      latticeAt(cellX, cellY + 1) * (1 - fracX) + latticeAt(cellX + 1, cellY + 1) * fracX
    return top * (1 - fracY) + bottom * fracY
  }

  const fbm = (posX: number, posY: number, octaves = 4) => {
    let sum = 0
    let amplitude = 0.5
    let frequency = 1
    for (let octave = 0; octave < octaves; octave++) {
      sum += amplitude * valueNoise(posX * frequency, posY * frequency)
      amplitude /= 2
      frequency *= 2
    }
    return sum
  }

  // Raw field, roughly 0 (dark) to 1 (colourful). Coordinates are normalised so the same seed
  // gives the same composition at any size or aspect ratio.
  const field = (pixelX: number, pixelY: number) => {
    const unitX = pixelX / width
    const unitY = pixelY / height
    // Domain warp so the gradient flows rather than running in a straight line.
    const warpX = fbm(unitX * 2.2 + 11, unitY * 2.2 + 3) - 0.5
    const warpY = fbm(unitX * 2.2 + 41, unitY * 2.2 + 17) - 0.5
    const warpedX = unitX + warpX * 0.9
    const warpedY = unitY + warpY * 1.3
    // Diagonal sweep: dark at the top-left, bright toward the bottom-right.
    const sweep = warpedX * 0.7 + warpedY * 0.55
    const detail = fbm(unitX * 5 + 90, unitY * 5 + 60) - 0.5
    return sweep + detail * 0.12
  }

  // Rescale the raw field so it spans the whole ramp (2nd to 98th percentile).
  const samples: number[] = []
  const step = Math.max(width, height) / 120
  for (let pixelY = 0; pixelY <= height; pixelY += step) {
    for (let pixelX = 0; pixelX <= width; pixelX += step) samples.push(field(pixelX, pixelY))
  }
  samples.sort((first, second) => first - second)
  const low = samples[Math.floor(samples.length * 0.02)]!
  const high = samples[Math.floor(samples.length * 0.98)]!
  const normalised = (pixelX: number, pixelY: number) =>
    Math.min(1, Math.max(0, (field(pixelX, pixelY) - low) / (high - low)))

  const margin = spacing / 2
  const cols = Math.floor((width - margin) / spacing) + 1
  const rows = Math.floor((height - margin) / spacing) + 1
  const offsetX = (width - (cols - 1) * spacing) / 2
  const offsetY = (height - (rows - 1) * spacing) / 2

  const byColour = new Map<string, Dot[]>()
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const centreX = offsetX + col * spacing
      const centreY = offsetY + row * spacing
      const level = normalised(centreX, centreY)
      const index = level * (DOT_GRID_RAMP.length - 1) + (rand() - 0.5) * 2 * dither
      const colour =
        DOT_GRID_RAMP[Math.min(DOT_GRID_RAMP.length - 1, Math.max(0, Math.round(index)))]!
      const radius = minRadius + (maxRadius - minRadius) * Math.pow(level, 0.9)
      const dots = byColour.get(colour) ?? []
      dots.push({ cx: round1(centreX), cy: round1(centreY), r: round1(radius) })
      byColour.set(colour, dots)
    }
  }

  return DOT_GRID_RAMP.filter((colour) => byColour.has(colour)).map((colour) => ({
    colour,
    dots: byColour.get(colour)!,
  }))
}
