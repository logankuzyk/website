import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Photo } from '@/payload-types'

type HomeArgs = {
  heroImage: Photo
  metaImage: Photo
  photoGridCollections?: string[]
  viewMorePage?: string
  photographyIndexPage?: string
}

export const home: (args: HomeArgs) => RequiredDataFromCollectionSlug<'pages'> = ({
  heroImage,
  metaImage,
  photoGridCollections = [],
  viewMorePage,
  photographyIndexPage,
}) => {
  const layout = [
    {
      blockType: 'photoGrid' as const,
      source: 'collections' as const,
      photoCollections: photoGridCollections,
      viewMorePage: viewMorePage
        ? { relationTo: 'pages' as const, value: viewMorePage }
        : undefined,
      linkLabel: 'View more',
      photographyIndexPage: photographyIndexPage ?? undefined,
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
