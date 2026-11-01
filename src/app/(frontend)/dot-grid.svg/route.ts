import { svgAssetHeaders } from '../../../../headers.js'
import { dotGridSvg, isDotGridSeed, isDotGridVariant } from '@/heros/Banner/dotGridSvg'

/**
 * Generated dot-grid banner background: `/dot-grid.svg?seed=7&variant=desktop`. Pure function
 * of its query, so the response is cached forever (`v` busts it when the generator changes).
 * Inputs are bounded, which also bounds the work an anonymous request can cause.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seed = Number(searchParams.get('seed') ?? 'x')
  const variant = searchParams.get('variant')

  if (!isDotGridSeed(seed) || !isDotGridVariant(variant)) {
    return new Response('Invalid seed or variant', { status: 400 })
  }

  return new Response(dotGridSvg(seed, variant), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...Object.fromEntries(svgAssetHeaders.map(({ key, value }) => [key, value])),
    },
  })
}
