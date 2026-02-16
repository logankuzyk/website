import type { Block } from 'payload'

export const PhotosPreview: Block = {
  slug: 'photosPreview',
  interfaceName: 'PhotosPreviewBlock',
  fields: [
    {
      name: 'items',
      type: 'array',
      minRows: 3,
      maxRows: 3,
      labels: {
        singular: 'Photo',
        plural: 'Photos',
      },
      fields: [
        {
          name: 'photo',
          type: 'relationship',
          relationTo: 'media',
          required: true,
          filterOptions: {
            mimeType: { contains: 'image' },
          },
          label: 'Photo',
        },
        {
          name: 'tag',
          type: 'relationship',
          relationTo: 'tags',
          required: true,
          label: 'Tag',
          admin: {
            description: 'Tag shown on hover and used for the link destination',
          },
        },
      ],
      admin: {
        description: 'Three photos displayed in a row. Each links to the Photos page filtered by its tag.',
      },
      label: 'Photos',
    },
    {
      name: 'photosPage',
      type: 'relationship',
      relationTo: 'pages',
      filterOptions: {
        template: { equals: 'photos' },
      },
      admin: {
        description: 'Photos page for "View more" link. When empty, uses the page with slug "photography".',
      },
      label: 'Photos page',
    },
    {
      name: 'showViewMore',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show the "View more" button linking to the Photos page',
      },
      label: 'Show View more button',
    },
    {
      name: 'linkLabel',
      type: 'text',
      defaultValue: 'View more',
      admin: {
        condition: (_, siblingData) => siblingData?.showViewMore !== false,
        description: 'Label for the link to the full Photos page',
      },
      label: 'Link label',
    },
  ],
  labels: {
    plural: 'Photos Previews',
    singular: 'Photos Preview',
  },
}
