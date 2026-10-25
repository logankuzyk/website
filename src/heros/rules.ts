type HeroData = {
  type?: string | null
  backgroundType?: string | null
}

/** Banner backgrounds default to an image when none was chosen. */
const bannerBackground = (data: HeroData) => data.backgroundType ?? 'image'

/** Whether the hero's `media` (photo) field applies for this hero configuration. */
export const heroShowsMedia = (data: HeroData | undefined): boolean => {
  if (!data) return false
  if (data.type === 'highImpact' || data.type === 'mediumImpact') return true
  return data.type === 'banner' && bannerBackground(data) === 'image'
}

