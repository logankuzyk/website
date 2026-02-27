/**
 * Returns the frontend URL for a page.
 * Home page (slug "home") maps to "/", others to "/{slug}".
 */
export function getPageUrl(page: { slug: string } | null | undefined): string {
  if (!page?.slug) return '/'
  if (page.slug === 'home') return '/'
  return `/${page.slug}`
}
