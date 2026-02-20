import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const PhotoCollections: CollectionConfig = {
  slug: 'photo-collections',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'displayOrder', 'hiddenFromIndex', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField({
      fieldToUse: 'name',
    }),
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Optional description for the collection',
      },
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'photos',
      admin: {
        description: 'Optional cover image. If not set, the first photo in the collection is used.',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'photo-tags',
      hasMany: true,
      required: true,
      admin: {
        description: 'Photos with any of these tags appear in this collection',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: {
        description: 'Controls order on the collections index (lower = earlier)',
      },
    },
    {
      name: 'hiddenFromIndex',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When checked, this collection is hidden from the main /photography page but remains accessible via direct link',
      },
      label: 'Hidden from photography index',
    },
  ],
  labels: {
    singular: 'Photo Collection',
    plural: 'Photo Collections',
  },
}
