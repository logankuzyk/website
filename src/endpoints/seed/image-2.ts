import type { Photo } from '@/payload-types'

export const image2: Omit<Photo, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Sample image two',
}
