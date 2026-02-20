'use client'

import type { Photo } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import Link from 'next/link'
import React from 'react'

type PhotosPreviewCardProps = {
  photo: Photo
  title: string
  href: string
}

export const PhotosPreviewCard: React.FC<PhotosPreviewCardProps> = ({
  photo,
  title,
  href,
}) => {
  return (
    <Link
      href={href}
      className="group block w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <MediaComponent
          resource={photo}
          fill
          className="relative block size-full transition-transform duration-300 group-hover:scale-105"
          imgClassName="object-cover object-center"
          loading="lazy"
        />
      </div>
      <span className="mt-2 block text-left text-sm font-medium">{title}</span>
    </Link>
  )
}
