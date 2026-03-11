import type { Block } from 'payload'

export const CareerTimeline: Block = {
  slug: 'careerTimeline',
  interfaceName: 'CareerTimelineBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional section title. When provided, a separator is shown below it.',
      },
      label: 'Title',
    },
  ],
  labels: {
    plural: 'Career Timelines',
    singular: 'Career Timeline',
  },
}
