import type { Block } from 'payload'

export const PhotoGrid: Block = {
  slug: 'photoGrid',
  interfaceName: 'PhotoGridBlock',
  fields: [
    {
      name: 'source',
      type: 'select',
      defaultValue: 'collections',
      admin: {
        description: 'Display photo collections or individual photos from a folder.',
      },
      options: [
        { label: 'Photo collections', value: 'collections' },
        { label: 'Individual photos', value: 'photos' },
      ],
      label: 'Source',
    },
    {
      name: 'photoCollections',
      type: 'relationship',
      relationTo: 'photo-collections',
      hasMany: true,
      admin: {
        condition: (_, siblingData) => siblingData?.source === 'collections',
        description: 'Select photo collections to display. Each shows its cover or first photo.',
      },
      label: 'Photo collections',
    },
    {
      name: 'photosFolder',
      type: 'relationship',
      relationTo: 'payload-folders',
      admin: {
        condition: (_, siblingData) => siblingData?.source === 'photos',
        description: 'Select which Media folder to display.',
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
        condition: (_, siblingData) => siblingData?.source === 'photos',
        description: 'Filter to media with any of these tags. Combine with folder for more specific filtering.',
      },
      label: 'Photos tags',
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional section title. When provided, a separator is shown below it.',
      },
      label: 'Title',
    },
    {
      name: 'showViewMore',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show the "View more" button linking to /photography',
      },
      label: 'Show View more button',
    },
    {
      name: 'linkLabel',
      type: 'text',
      defaultValue: 'View more',
      admin: {
        condition: (_, siblingData) => siblingData?.showViewMore !== false,
        description: 'Label for the link to the photography collections index',
      },
      label: 'Link label',
    },
    {
      name: 'masonry',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Use masonry layout. When off, uses a regular grid.',
      },
      label: 'Masonry layout',
    },
    {
      name: 'cropToSquare',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Crop all photos to square aspect ratio.',
      },
      label: 'Crop to square',
    },
    {
      name: 'showCollectionNames',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_, siblingData) => siblingData?.source === 'collections',
        description: 'Show collection name below each collection preview.',
      },
      label: 'Show collection names',
    },
    {
      name: 'enableFullScreen',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Allow clicking photos to open full screen view.',
      },
      label: 'Enable full screen view',
    },
    {
      name: 'enableCarousel',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_, siblingData) => siblingData?.enableFullScreen !== false,
        description: 'Allow navigating between photos in full screen (only when full screen is enabled).',
      },
      label: 'Enable carousel',
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        description: 'Maximum number of entries to display. Leave empty for no limit.',
      },
      label: 'Total limit',
    },
  ],
  labels: {
    plural: 'Photo Grids',
    singular: 'Photo Grid',
  },
}
