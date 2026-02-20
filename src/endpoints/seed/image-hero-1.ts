import type { Photo } from '@/payload-types'

export const imageHero1: Omit<Photo, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Hero image',
}
