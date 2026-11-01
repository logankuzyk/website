import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'
import { bannerColourOptions } from '@/heros/Banner/colours'
import { heroShowsMedia } from '@/heros/rules'

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
          label: 'Banner',
          value: 'banner',
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
        condition: (_, { type } = {}) => !['landing', 'banner'].includes(type ?? ''),
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
      name: 'heading',
      type: 'text',
      admin: { condition: (_, { type } = {}) => type === 'banner' },
      label: 'Heading',
    },
    {
      name: 'backgroundType',
      type: 'select',
      defaultValue: 'image',
      label: 'Background',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Colour', value: 'colour' },
        { label: 'Vector', value: 'vector' },
        { label: 'Dot grid', value: 'dotGrid' },
      ],
      admin: { condition: (_, { type } = {}) => type === 'banner' },
    },
    {
      name: 'dotGridSeed',
      type: 'number',
      defaultValue: 7,
      label: 'Dot grid seed',
      min: 0,
      max: 999999,
      validate: (value: number | null | undefined) =>
        value == null || Number.isInteger(value) || 'Seed must be a whole number',
      admin: {
        description: 'Each number gives a different, repeatable pattern. Try a few.',
        condition: (_, { type, backgroundType } = {}) =>
          type === 'banner' && backgroundType === 'dotGrid',
      },
    },
    {
      name: 'backgroundOpacity',
      type: 'number',
      label: 'Background opacity (%)',
      min: 0,
      max: 100,
      admin: {
        description:
          'Lower it so the heading stays readable. Leave empty for the default: 60 for the dot grid, 100 for a vector.',
        condition: (_, { type, backgroundType } = {}) =>
          type === 'banner' && (backgroundType === 'vector' || backgroundType === 'dotGrid'),
      },
    },
    {
      name: 'colour',
      type: 'select',
      defaultValue: 'primary',
      label: 'Colour',
      options: bannerColourOptions,
      admin: {
        condition: (_, { type, backgroundType } = {}) =>
          type === 'banner' && backgroundType === 'colour',
      },
    },
    {
      name: 'vectorMedia',
      type: 'upload',
      label: 'Vector background',
      relationTo: 'assets',
      admin: {
        condition: (_, { type, backgroundType } = {}) =>
          type === 'banner' && backgroundType === 'vector',
      },
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
      relationTo: 'photos',
      label: 'Profile image',
    },
    linkGroup({
      overrides: {
        maxRows: 2,
        admin: {
          condition: (_, { type } = {}) => !['landing', 'banner'].includes(type ?? ''),
        },
      },
    }),
    {
      name: 'media',
      type: 'upload',
      admin: {
        condition: (_, siblingData) => heroShowsMedia(siblingData),
      },
      relationTo: 'photos',
      // Payload skips validation of a field whose `admin.condition` is false, so this only
      // bites where the photo is shown (impact heroes, banner image mode).
      required: true,
    },
  ],
  label: false,
}
