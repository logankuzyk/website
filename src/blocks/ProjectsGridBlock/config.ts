import type { Block } from 'payload'

export const ProjectsGrid: Block = {
  slug: 'projectsGrid',
  interfaceName: 'ProjectsGridBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional section title. When provided, a separator is shown below it.',
      },
      label: 'Title',
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        description: 'Maximum number of projects to display. Leave empty for no limit.',
      },
      label: 'Limit',
    },
  ],
  labels: {
    plural: 'Projects Grids',
    singular: 'Projects Grid',
  },
}
