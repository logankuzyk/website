import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { linkGroup } from '@/fields/linkGroup'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Type',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'Landing',
          value: 'landing',
        },
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
      type: 'richText',
      admin: {
        condition: (_, { type } = {}) => type !== 'landing',
      },
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    {
      name: 'name',
      type: 'text',
      admin: { condition: (_, { type } = {}) => type === 'landing' },
      label: 'Name',
    },
    {
      name: 'role',
      type: 'text',
      admin: { condition: (_, { type } = {}) => type === 'landing' },
      label: 'Role / Title',
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: { condition: (_, { type } = {}) => type === 'landing' },
      label: 'Short bio',
    },
    {
      name: 'profileImage',
      type: 'upload',
      admin: { condition: (_, { type } = {}) => type === 'landing' },
      relationTo: 'media',
      label: 'Profile image',
    },
    link({
      overrides: {
        name: 'scrollLink',
        admin: {
          condition: (_, { type } = {}) => type === 'landing',
          description: 'Link shown below the hero (e.g. to Career page)',
        },
        label: 'Scroll link',
      },
    }),
    linkGroup({
      overrides: {
        maxRows: 2,
        admin: {
          condition: (_, { type } = {}) => type !== 'landing',
        },
      },
    }),
    {
      name: 'media',
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) =>
          ['highImpact', 'mediumImpact'].includes(type ?? ''),
      },
      relationTo: 'media',
      required: true,
    },
  ],
  label: false,
}
