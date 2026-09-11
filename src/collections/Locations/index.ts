import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { revalidateLocation, revalidateLocationDelete } from './hooks/revalidateLocation'
import { preventCircularReference, syncParentChildren } from './hooks/syncParentChildren'

export const Locations: CollectionConfig = {
  slug: 'locations',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'parent', 'updatedAt'],
    useAsTitle: 'name',
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
      relationTo: 'locations',
      admin: {
        description: 'Optional parent location. Leave empty for top-level.',
      },
      filterOptions: ({ id }) =>
        id != null ? { id: { not_equals: id } } : true,
      label: 'Parent location',
    },
    {
      name: 'children',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: {
        description: 'Child locations. You can also set the parent on each child.',
      },
      filterOptions: ({ id }) =>
        id != null ? { id: { not_equals: id } } : true,
      label: 'Child locations',
    },
  ],
  hooks: {
    beforeChange: [preventCircularReference],
    afterChange: [syncParentChildren, revalidateLocation],
    afterDelete: [revalidateLocationDelete],
  },
}
