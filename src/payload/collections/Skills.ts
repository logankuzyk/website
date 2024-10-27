import type { CollectionConfig } from 'payload/types'

const Skills: CollectionConfig = {
  slug: 'skills',
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

export default Skills
