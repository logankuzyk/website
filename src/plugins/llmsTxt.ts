import type { LlmsTxtPluginOptions } from 'payload-plugin-llms-txt'
import { getServerSideURL } from '@/utilities/getURL'

export const llmsTxtOptions: LlmsTxtPluginOptions = {
  siteName: 'Logan Kuzyk',
  siteDescription:
    'Personal website for Logan Kuzyk — projects, blog posts, career history, and photography.',
  siteURL: getServerSideURL(),
  enableFullText: true,
  addSettingsGlobal: true,
  collections: [
    {
      slug: 'posts',
      descriptionField: 'meta.description',
      contentField: 'content',
      urlPath: (doc) => `/posts/${doc.slug}`,
    },
    {
      slug: 'projects',
      descriptionField: 'description',
      contentField: 'content',
      urlPath: (doc) => `/projects/${doc.slug}`,
    },
    {
      slug: 'pages',
      descriptionField: 'meta.description',
      label: 'Pages',
      urlPath: (doc) => (doc.slug === 'home' ? '/' : `/${doc.slug}`),
    },
  ],
}
