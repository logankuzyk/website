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
    defaultColumns: ['name', 'slug', 'parent', 'displayOrder', 'hiddenFromIndex', 'updatedAt'],
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
      name: 'parent',
      type: 'relationship',
      relationTo: 'photo-collections',
      admin: {
        description: 'Optional parent collection. Leave empty for top-level sets.',
      },
      filterOptions: ({ id }) =>
        id != null ? { id: { not_equals: id } } : true,
      label: 'Parent collection',
    },
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
      name: 'filter',
      type: 'array',
      defaultValue: [
        {
          field: 'tags',
          operator: 'in',
        },
      ],
      admin: {
        description:
          'Filter photos by any property. Add conditions to define which photos appear in this collection. All conditions are combined with AND.',
        initCollapsed: false,
      },
      labels: {
        singular: 'Condition',
        plural: 'Filter conditions',
      },
      label: 'Filter',
      fields: [
        {
          name: 'field',
          type: 'select',
          required: true,
          options: [
            { label: 'Tags', value: 'tags' },
            { label: 'Folder', value: 'folder' },
            { label: 'Width', value: 'width' },
            { label: 'Height', value: 'height' },
            { label: 'Display order', value: 'displayOrder' },
            { label: 'File size (bytes)', value: 'filesize' },
            { label: 'Alt text', value: 'alt' },
            { label: 'Filename', value: 'filename' },
            { label: 'MIME type', value: 'mimeType' },
            { label: 'EXIF Make', value: 'exif.Make' },
            { label: 'EXIF Model', value: 'exif.Model' },
            { label: 'EXIF ISO', value: 'exif.ISO' },
            { label: 'EXIF Focal length', value: 'exif.FocalLength' },
          ],
        },
        {
          name: 'operator',
          type: 'select',
          required: true,
          options: [
            { label: 'Equals', value: 'equals' },
            { label: 'Not equals', value: 'not_equals' },
            { label: 'Contains', value: 'contains' },
            { label: 'In (any of)', value: 'in' },
            { label: 'Not in', value: 'not_in' },
            { label: 'Greater than', value: 'greater_than' },
            { label: 'Less than', value: 'less_than' },
            { label: 'Greater or equal', value: 'greater_than_equal' },
            { label: 'Less or equal', value: 'less_than_equal' },
            { label: 'Exists', value: 'exists' },
          ],
        },
        {
          name: 'valueTags',
          type: 'relationship',
          relationTo: 'photo-tags',
          hasMany: true,
          admin: {
            condition: (_, siblingData) =>
              siblingData?.field === 'tags' && siblingData?.operator !== 'exists',
            description: 'Select tags. Photos with any of these tags will match.',
          },
        },
        {
          name: 'valueFolder',
          type: 'relationship',
          relationTo: 'payload-folders',
          filterOptions: {
            folderType: { contains: 'photos' },
          },
          admin: {
            condition: (_, siblingData) =>
              siblingData?.field === 'folder' && siblingData?.operator !== 'exists',
            description: 'Select folder. Only photos in this folder will match.',
          },
        },
        {
          name: 'valueNumber',
          type: 'number',
          admin: {
            condition: (_, siblingData) => {
              const numFields = ['width', 'height', 'displayOrder', 'filesize']
              return numFields.includes(siblingData?.field) && siblingData?.operator !== 'exists'
            },
          },
        },
        {
          name: 'valueText',
          type: 'text',
          admin: {
            condition: (_, siblingData) => {
              const relFields = ['tags', 'folder']
              const numFields = ['width', 'height', 'displayOrder', 'filesize']
              const field = siblingData?.field
              return (
                field &&
                !relFields.includes(field) &&
                !numFields.includes(field) &&
                siblingData?.operator !== 'exists'
              )
            },
            description: 'For "in" operator with multiple values, use comma-separated IDs.',
          },
        },
      ],
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
        description:
          'When checked, this collection is hidden from the gallery index but remains accessible via direct link',
      },
      label: 'Hidden from photography index',
    },
    {
      name: 'displayMasonry',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Use masonry layout on the collection page. When off, uses a regular grid.',
      },
      label: 'Masonry layout',
    },
    {
      name: 'displayCropToSquare',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Crop all photos to square aspect ratio on the collection page.',
      },
      label: 'Crop to square',
    },
    {
      name: 'displayEnableFullScreen',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Allow clicking photos to open full screen view.',
      },
      label: 'Enable full screen view',
    },
    {
      name: 'displayEnableCarousel',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_, siblingData) => siblingData?.displayEnableFullScreen !== false,
        description:
          'Allow navigating between photos in full screen (only when full screen is enabled).',
      },
      label: 'Enable carousel',
    },
    {
      name: 'displayLimit',
      type: 'number',
      admin: {
        description:
          'Maximum number of photos to display on the collection page. Leave empty for no limit.',
      },
      label: 'Total limit',
    },
  ],
  labels: {
    singular: 'Photo Collection',
    plural: 'Photo Collections',
  },
}
