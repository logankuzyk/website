import type { Payload } from 'payload'
import type { Page } from '@/payload-types'

import { getPageUrl } from './getPageUrl'

/**
 * Path that photo collection pages live under, e.g. "/photography". Pass the `site` global's
 * `photographyIndexPage` (populated or as an id). Falls back to "/photography" when no index
 * page is set or it is the home page.
 */
export async function getPhotographyBasePath(
  indexPage: string | Page | null | undefined,
  payload: Payload,
): Promise<string> {
  const page =
    typeof indexPage === 'object' && indexPage
      ? indexPage
      : indexPage
        ? await payload.findByID({
            collection: 'pages',
            id: indexPage,
            depth: 0,
          })
        : null
  const baseUrl = getPageUrl(page)
  return !page || baseUrl === '/' ? '/photography' : baseUrl
}
