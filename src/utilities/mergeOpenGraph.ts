import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: `Logan's Personal Website`,
  images: [
    {
      url: `${getServerSideURL()}/website-template-OG.webp`,
    },
  ],
  siteName: 'Logan Kuzyk',
  title: 'Logan Kuzyk',
}

export const mergeOpenGraph = (override?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...override,
    images: override?.images ? override.images : defaultOpenGraph.images,
  }
}
