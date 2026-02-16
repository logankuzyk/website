import type { Media } from '@/payload-types'

export const image2: Omit<Media, 'createdAt' | 'id' | 'updatedAt'> = {
  alt: 'Sample image two',
}
