import type { Media, User } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'

export type PostArgs = {
  heroImage: Media
  blockImage: Media
  author: User
}

const paragraph = (text: string) => ({
  type: 'paragraph' as const,
  children: [
    {
      type: 'text' as const,
      detail: 0,
      format: 0,
      mode: 'normal' as const,
      style: '',
      text,
      version: 1,
    },
  ],
  direction: 'ltr' as const,
  format: '',
  indent: 0,
  textFormat: 0,
  version: 1,
})

const heading = (text: string, tag: 'h2' | 'h3' = 'h2') => ({
  type: 'heading' as const,
  children: [
    {
      type: 'text' as const,
      detail: 0,
      format: 0,
      mode: 'normal' as const,
      style: '',
      text,
      version: 1,
    },
  ],
  direction: 'ltr' as const,
  format: '',
  indent: 0,
  tag,
  version: 1,
})

export const post1: (args: PostArgs) => RequiredDataFromCollectionSlug<'posts'> = ({
  heroImage,
  blockImage,
  author,
}) => ({
  slug: 'sample-post-one',
  _status: 'published',
  authors: [author],
  content: {
    root: {
      type: 'root',
      children: [
        heading('Sample Post One'),
        paragraph(
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        ),
        {
          type: 'block',
          fields: {
            blockName: '',
            blockType: 'mediaBlock',
            media: blockImage.id,
          },
          format: '',
          version: 2,
        },
        heading('More Content', 'h3'),
        paragraph(
          'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
        ),
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  },
  heroImage: heroImage.id,
  meta: {
    description: 'Sample post one - placeholder content for demonstration.',
    image: heroImage.id,
    title: 'Sample Post One',
  },
  relatedPosts: [],
  title: 'Sample Post One',
})
