import type { TaskConfig } from 'payload'

import { generatePhotoAltText } from './generate'

export const ALT_TEXT_TASK = 'generateAltText'

// A dedicated queue so `jobs.autoRun` (payload.config.ts) can drain these without also picking
// up the default queue, which carries scheduled publishes.
export const ALT_TEXT_QUEUE = 'alt-text'

/**
 * Retry path for uploads whose inline alt text generation failed (see `generateAltTextOnUpload`).
 * Only ever fills a blank `alt`: anything written since the job was queued wins.
 *
 * Caveat: the autoRun cron is not a Next request, so the `revalidatePhoto` hook may not be able
 * to revalidate cache tags (it logs a warning when it can't). The sitemap and new-tab manifest
 * then pick the text up on the next photo change.
 */
export const generateAltTextTask: TaskConfig<typeof ALT_TEXT_TASK> = {
  slug: ALT_TEXT_TASK,
  label: 'Generate photo alt text',
  inputSchema: [{ name: 'photoId', type: 'text', required: true }],
  outputSchema: [{ name: 'status', type: 'text' }],
  retries: { attempts: 4, backoff: { type: 'exponential', delay: 2 * 60_000 } },
  handler: async ({ input, req }) => {
    const result = await generatePhotoAltText({ id: input.photoId, overwrite: 'empty', req })
    return { output: { status: result.status } }
  },
}
