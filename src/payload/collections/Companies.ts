import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { slugField } from '../fields/slug'

const Companies: CollectionConfig = {
  slug: 'companies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
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
    {
      name: 'url',
      type: 'text',
      required: false,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'assets',
      required: false,
    },
    slugField(),
  ],
}

export default Companies
