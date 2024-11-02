import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { slugField } from '../fields/slug'

const Locations: CollectionConfig = {
  slug: 'locations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent'],
  },
  access: {
    read: adminsOrPublished,
    update: admins,
    create: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField(),
  ],
}

export default Locations
