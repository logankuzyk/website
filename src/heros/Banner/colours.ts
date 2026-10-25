/**
 * Theme tokens selectable as a banner's solid background, each with the token that stays
 * readable on it. These are the semantic tokens from `globals.css` (not raw palette values),
 * so every entry follows light/dark. Class names are spelled out in full so Tailwind sees them.
 */
export const bannerColours = {
  primary: { label: 'Primary', className: 'bg-primary text-primary-foreground' },
  secondary: { label: 'Secondary', className: 'bg-secondary text-secondary-foreground' },
  accent: { label: 'Accent', className: 'bg-accent text-accent-foreground' },
  muted: { label: 'Muted', className: 'bg-muted text-foreground' },
  card: { label: 'Card', className: 'bg-card text-card-foreground' },
  inverse: { label: 'Inverse', className: 'bg-foreground text-background' },
} as const

export type BannerColour = keyof typeof bannerColours

export const bannerColourOptions = (
  Object.entries(bannerColours) as [BannerColour, (typeof bannerColours)[BannerColour]][]
).map(([value, { label }]) => ({ label, value }))
