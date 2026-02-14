import type { RequiredDataFromCollectionSlug } from 'payload'
import type { Media } from '@/payload-types'

type HomeArgs = {
  heroImage: Media
  metaImage: Media
}

export const home: (args: HomeArgs) => RequiredDataFromCollectionSlug<'pages'> = ({
  heroImage,
  metaImage,
}) => {
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
      scrollLink: {
        type: 'custom',
        url: '/career',
        label: 'Career',
        newTab: false,
      },
    },
    layout: [],
    meta: {
      description: 'Your Name - Your Title',
      image: metaImage.id,
      title: 'Your Name',
    },
    title: 'Home',
  }
}
