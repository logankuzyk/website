import type { CollectionConfig } from 'payload/types'

const MediaTags: CollectionConfig = {
  slug: 'media-tags',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
  ],
}

export default MediaTags
