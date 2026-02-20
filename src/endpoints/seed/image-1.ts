import type { Photo } from '@/payload-types'

export const image1: Omit<Photo, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Sample image one',
}
