'use client'

import type { Media, Tag } from '@/payload-types'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import Link from 'next/link'
import React from 'react'

type PhotosPreviewCardProps = {
  photo: Media
  tag: Tag
  photosPageSlug: string
}

export const PhotosPreviewCard: React.FC<PhotosPreviewCardProps> = ({
  photo,
  tag,
  photosPageSlug,
}) => {
  const href = `/${photosPageSlug}/${tag.slug}`
  const src =
    typeof photo === 'object' && photo?.url
      ? getMediaUrl(photo.url, photo.updatedAt)
      : ''

  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="relative aspect-3/4 w-full overflow-hidden">
        <img
          src={src}
          alt={typeof photo === 'object' ? photo.alt ?? '' : ''}
          loading="lazy"
          className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/50">
        <span className="text-lg font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:text-xl">
          {tag.name}
        </span>
      </div>
    </Link>
  )
}
