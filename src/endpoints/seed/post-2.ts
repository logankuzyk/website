import { RequiredDataFromCollectionSlug } from 'payload'
import type { PostArgs } from './post-1'

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

export const post2: (args: PostArgs) => RequiredDataFromCollectionSlug<'posts'> = ({
  heroImage,
  blockImage,
  author,
}) => ({
  slug: 'sample-post-two',
  _status: 'published',
  authors: [author],
  content: {
    root: {
      type: 'root',
      children: [
        heading('Sample Post Two'),
        paragraph(
          'This is placeholder content for a second sample post. Replace this with your own content in the admin dashboard.',
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
        paragraph('Add more blocks and content as needed for your site.'),
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  },
  heroImage: heroImage.id,
  meta: {
    description: 'Sample post two - placeholder content for demonstration.',
    image: heroImage.id,
    title: 'Sample Post Two',
  },
  relatedPosts: [],
  title: 'Sample Post Two',
})
