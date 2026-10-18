import type { Endpoint } from 'payload'

import { generatePhotoAltText } from './generate'
import { isAltTextConfigured } from './workersAI'

/**
 * `POST /api/photos/:id/alt-text` — the admin "Regenerate alt text" button. Unlike the other
 * entry points this replaces whatever is there, hand-written text included, and saves it: the
 * click is the consent, so the response is the stored value rather than a suggestion.
 */
export const generateAltTextEndpoint: Endpoint = {
  path: '/:id/alt-text',
  method: 'post',
  handler: async (req) => {
    // Same bar as the collection's `update` access (any authenticated user).
    if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isAltTextConfigured()) {
      return Response.json(
        {
          error:
            'Alt text generation is not configured: set CLOUDFLARE_ACCOUNT_ID and WORKERS_AI_API_TOKEN.',
        },
        { status: 503 },
      )
    }

    const id = req.routeParams?.id
    if (typeof id !== 'string' || !id) {
      return Response.json({ error: 'Photo not found' }, { status: 404 })
    }

    try {
      const result = await generatePhotoAltText({ id, overwrite: 'always', req })
      // With `overwrite: 'always'` the only way to be skipped is a missing photo.
      if (result.status === 'skipped') {
        return Response.json({ error: 'Photo not found' }, { status: 404 })
      }
      return Response.json({ alt: result.alt, altSource: 'ai' })
    } catch (err) {
      // The stack goes to the log; the client only gets the message.
      req.payload.logger.error({ err, msg: `alt text: regeneration failed for photo ${id}` })
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      )
    }
  },
}
