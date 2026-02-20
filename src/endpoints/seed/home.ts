import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Photo } from '@/payload-types'

type HomeArgs = {
  heroImage: Photo
  metaImage: Photo
  photosPreviewCollections?: string[]
}

export const home: (args: HomeArgs) => RequiredDataFromCollectionSlug<'pages'> = ({
  heroImage,
  metaImage,
  photosPreviewCollections = [],
}) => {
  const layout = [
    {
      blockType: 'photosPreview' as const,
      items: photosPreviewCollections.slice(0, 3).map((collectionId) => ({
        photoCollection: collectionId,
      })),
      showViewMore: true,
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
