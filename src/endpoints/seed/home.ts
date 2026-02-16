import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Media } from '@/payload-types'

type PhotosPreviewItem = {
  photoId: string
  tagId: string
}

type HomeArgs = {
  heroImage: Media
  metaImage: Media
  photosPageId?: string
  photosPreviewItems?: PhotosPreviewItem[]
}

export const home: (args: HomeArgs) => RequiredDataFromCollectionSlug<'pages'> = ({
  heroImage,
  metaImage,
  photosPageId,
  photosPreviewItems = [],
}) => {
  const layout = [
    {
      blockType: 'photosPreview' as const,
      items: photosPreviewItems.slice(0, 3).map(({ photoId, tagId }) => ({
        photo: photoId,
        tag: tagId,
      })),
      photosPage: photosPageId ?? undefined,
      linkLabel: 'View more',
    },
  ]

  return {
    slug: 'home',
    _status: 'published',
    template: 'default',
    hero: {
      type: 'landing',
      name: 'Your Name',
      role: 'Your Title',
      bio: 'Your bio goes here.',
      profileImage: heroImage.id,
    },
    layout,
    meta: {
      description: 'Your Name - Your Title',
      image: metaImage.id,
      title: 'Your Name',
    },
    title: 'Home',
  }
}
