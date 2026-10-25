import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { listGallery } from '../../components/ListGallery/config'
import { appendPrefixToCollectionBeforeChangeHook } from '../../hooks/uploadPrefixed'
import { validateSvgDimensions } from './hooks/validateSvgDimensions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * SVG backgrounds (patterns, gradients) for banner heroes. Kept apart from `photos`, which
 * excludes SVG on purpose: SVGs here are never rasterised or resized, and are only ever
 * rendered through `<img>` (scripts in an SVG don't run there).
 */
export const Assets: CollectionConfig = {
  slug: 'assets',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'updatedAt'],
    components: listGallery(),
  },
  folders: true,
  hooks: {
    beforeOperation: [validateSvgDimensions],
    beforeChange: [appendPrefixToCollectionBeforeChangeHook('assets')],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [],
  upload: {
    staticDir: path.resolve(dirname, '../../../public/assets'),
    mimeTypes: ['image/svg+xml'],
    // The SVG is its own thumbnail. A function (not the string form) so R2 serves it from the
    // CDN URL, as for photos (payloadcms/payload#12659).
    adminThumbnail: ({ doc }) => (typeof doc?.url === 'string' ? doc.url : false),
  },
}
