import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { appendPrefixToCollectionBeforeChangeHook } from '../hooks/uploadPrefixed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Photos: CollectionConfig = {
  slug: 'photos',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'tags', 'displayOrder', 'updatedAt'],
  },
  folders: true,
  hooks: {
    beforeChange: [appendPrefixToCollectionBeforeChangeHook('photos')],
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'photo-tags',
      hasMany: true,
      admin: {
        description: 'Tags for filtering in photo galleries',
      },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      admin: {
        description: 'Location where the photo was taken. Used for filtering in collections.',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: {
        description: 'Controls order in photos gallery (lower = earlier)',
      },
    },
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // Upload to the public/photos directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/photos'),
    // Use a function when R2 is enabled: string adminThumbnail causes Payload to fall back to /api/...
    // URLs which don't work with disablePayloadAccessControl. See payloadcms/payload#12659
    adminThumbnail:
      process.env.R2_BUCKET && process.env.STORAGE_URL
        ? ({ doc }) => {
            const sizes = doc?.sizes as Record<string, { url?: string; filename?: string }> | undefined
            const thumbnail = sizes?.thumbnail
            if (thumbnail?.url) return thumbnail.url
            if (thumbnail?.filename) {
              const baseUrl = process.env.STORAGE_URL!.replace(/\/$/, '')
              return [baseUrl, 'photos', encodeURIComponent(thumbnail.filename)].join('/')
            }
            return false
          }
        : 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
