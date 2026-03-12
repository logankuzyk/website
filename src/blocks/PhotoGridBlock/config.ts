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
      name: 'photosFrom',
      type: 'select',
      defaultValue: 'folder',
      admin: {
        condition: (_, siblingData) => siblingData?.source === 'photos',
        description: 'Display photos from a folder or from a photo collection.',
      },
      options: [
        { label: 'Folder', value: 'folder' },
        { label: 'Collection', value: 'collection' },
      ],
      label: 'Photos from',
    },
    {
      name: 'photosFolder',
      type: 'relationship',
      relationTo: 'payload-folders',
      admin: {
        condition: (_, siblingData) =>
          siblingData?.source === 'photos' && siblingData?.photosFrom === 'folder',
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
        condition: (_, siblingData) =>
          siblingData?.source === 'photos' && siblingData?.photosFrom === 'folder',
        description:
          'Filter to media with any of these tags. Combine with folder for more specific filtering.',
      },
      label: 'Photos tags',
    },
    {
      name: 'photosFromCollection',
      type: 'relationship',
      relationTo: 'photo-collections',
      admin: {
        condition: (_, siblingData) =>
          siblingData?.source === 'photos' && siblingData?.photosFrom === 'collection',
        description: 'Select a photo collection. Photos matching the collection filter will be displayed.',
      },
      label: 'Photo collection',
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
      name: 'viewMorePage',
      type: 'relationship',
      relationTo: ['pages', 'photo-collections'],
      admin: {
        description: 'When set, shows a "View more" button linking to this page or photo collection.',
      },
      label: 'View more link',
    },
    {
      name: 'linkLabel',
      type: 'text',
      defaultValue: 'View more',
      admin: {
        condition: (_, siblingData) => Boolean(siblingData?.viewMorePage),
        description: 'Label for the View more button. Leave empty to use the linked page or collection title.',
      },
      label: 'Link label',
    },
    {
      name: 'photographyIndexPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        condition: (_, siblingData) => siblingData?.source === 'collections',
        description:
          'Page used as the base for collection links. Collection URLs will be {pageUrl}/{collectionSlug}.',
      },
      label: 'Photography index page',
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
        description:
          'Allow navigating between photos in full screen (only when full screen is enabled).',
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
    {
      name: 'overscan',
      type: 'number',
      defaultValue: 2,
      admin: {
        description:
          'Number of rows to render outside the visible area when using virtualization (grid or square crop layouts). Higher values reduce blank space when scrolling but use more memory.',
      },
      label: 'Virtualization overscan',
    },
  ],
  labels: {
    plural: 'Photo Grids',
    singular: 'Photo Grid',
  },
}
