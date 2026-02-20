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
        singular: 'Collection',
        plural: 'Collections',
      },
      fields: [
        {
          name: 'photoCollection',
          type: 'relationship',
          relationTo: 'photo-collections',
          required: true,
          label: 'Photo Collection',
          admin: {
            description: 'Collection to display. Uses cover image or first photo in collection.',
          },
        },
      ],
      admin: {
        description: 'Three photo collections displayed in a row. Each links to its collection page.',
      },
      label: 'Collections',
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
  ],
  labels: {
    plural: 'Photos Previews',
    singular: 'Photos Preview',
  },
}
