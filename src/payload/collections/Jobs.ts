import type { CollectionConfig } from 'payload/types'

import { admins } from '../access/admins'
import { adminsOrPublished } from '../access/adminsOrPublished'
import { slugField } from '../fields/slug'

const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    preview: doc => {
      return `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/next/preview?url=${encodeURIComponent(
        `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/projects/${doc?.slug}`,
      )}&secret=${process.env.PAYLOAD_PUBLIC_DRAFT_SECRET}`
    },
  },
  versions: {
    drafts: true,
  },
  access: {
    read: adminsOrPublished,
    update: admins,
    create: admins,
    delete: admins,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      hasMany: false,
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'skills',
      type: 'relationship',
      relationTo: 'skills',
      required: false,
      hasMany: true,
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'dateRange',
      type: 'text',
      required: true,
    },
    {
      name: 'dateStarted',
      type: 'date',
      required: true,
    },
    slugField(),
  ],
}

export default Jobs
