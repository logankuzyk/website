import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { slugField } from 'payload'

import { revalidatePhotoTag, revalidatePhotoTagDelete } from './hooks/revalidateTag'

export const Tags: CollectionConfig = {
  slug: 'photo-tags',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    description: 'Tags for filtering in photo galleries',
  },
  labels: {
    singular: 'Photo Tag',
    plural: 'Photo Tags',
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
  ],
  hooks: {
    afterChange: [revalidatePhotoTag],
    afterDelete: [revalidatePhotoTagDelete],
  },
}
