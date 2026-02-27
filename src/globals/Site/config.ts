import type { GlobalConfig } from 'payload'

import { revalidateSite } from './hooks/revalidateSite'

export const Site: GlobalConfig = {
  slug: 'site',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'photographyIndexPage',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        description:
          'Page used as the base for photography collection URLs. Collection links will be {pageUrl}/{collectionSlug}. Create a page with slug "photography" to match the /photography route.',
      },
      label: 'Photography index page',
    },
  ],
  hooks: {
    afterChange: [revalidateSite],
  },
}
