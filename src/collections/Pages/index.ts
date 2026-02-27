import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { PhotoGrid } from '../../blocks/PhotoGridBlock/config'
import { hero } from '@/heros/config'
import { slugField } from 'payload'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'template',
              type: 'select',
              defaultValue: 'default',
              required: true,
              admin: {
                description: 'Choose the page layout. Career and Photos use predefined templates.',
              },
              options: [
                { label: 'Default (Blocks)', value: 'default' },
                { label: 'Career', value: 'career' },
                { label: 'Photos', value: 'photos' },
              ],
            },
            {
              name: 'photosSource',
              type: 'select',
              defaultValue: 'photos',
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'photos',
                description: 'Display individual photos (from folder/tags) or photo collection previews.',
              },
              options: [
                { label: 'Individual photos', value: 'photos' },
                { label: 'Photo collections', value: 'collections' },
              ],
              label: 'Photos source',
            },
            {
              name: 'photosFolder',
              type: 'relationship',
              relationTo: 'payload-folders',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosSource === 'photos',
                description:
                  'Select which Media folder to display. Create folders in Media to organize photo subcollections (e.g. landscapes, portraits).',
              },
              filterOptions: {
                folderType: { contains: 'photos' },
              },
              label: 'Photos folder',
            },
            {
              name: 'photosTags',
              type: 'relationship',
              relationTo: 'photo-tags',
              hasMany: true,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosSource === 'photos',
                description:
                  'Filter to media with any of these tags. Combine with folder for more specific filtering.',
              },
              label: 'Photos tags',
            },
            {
              name: 'photoCollections',
              type: 'relationship',
              relationTo: 'photo-collections',
              hasMany: true,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosSource === 'collections',
                description: 'Select photo collections to display. Each shows its cover or first photo.',
              },
              label: 'Photo collections',
            },
            {
              name: 'photosPhotographyIndexPage',
              type: 'relationship',
              relationTo: 'pages',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosSource === 'collections',
                description:
                  'Page used as the base for collection links. Collection URLs will be {pageUrl}/{collectionSlug}.',
              },
              label: 'Photography index page',
            },
            {
              name: 'photosMasonry',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'photos',
                description: 'Use masonry layout. When off, uses a regular grid.',
              },
              label: 'Masonry layout',
            },
            {
              name: 'photosCropToSquare',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'photos',
                description: 'Crop all photos to square aspect ratio.',
              },
              label: 'Crop to square',
            },
            {
              name: 'photosShowCollectionNames',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosSource === 'collections',
                description: 'Show collection name below each collection preview.',
              },
              label: 'Show collection names',
            },
            {
              name: 'photosEnableFullScreen',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'photos',
                description: 'Allow clicking photos to open full screen view.',
              },
              label: 'Enable full screen view',
            },
            {
              name: 'photosEnableCarousel',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.template === 'photos' && siblingData?.photosEnableFullScreen !== false,
                description: 'Allow navigating between photos in full screen (only when full screen is enabled).',
              },
              label: 'Enable carousel',
            },
            {
              name: 'photosLimit',
              type: 'number',
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'photos',
                description: 'Maximum number of entries to display. Leave empty for no limit.',
              },
              label: 'Total limit',
            },
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock, Archive, FormBlock, PhotoGrid],
              admin: {
                condition: (_, siblingData) => siblingData?.template === 'default',
                description: 'Add content blocks. Only shown when using Default template.',
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'photos',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
