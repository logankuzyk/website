'use client'

import type { Media } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import { PhotoCarousel } from '@/components/PhotoCarousel/PhotoCarousel'
import Masonry from 'react-layout-masonry'
import React, { useCallback, useEffect, useState } from 'react'

type PhotosMasonryProps = {
  photos: Media[]
}

const PhotoCard = ({ photo, onClick }: { photo: Media; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full cursor-pointer overflow-hidden g-card text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  >
    <MediaComponent resource={photo} imgClassName="w-full h-auto object-cover" />
  </button>
)

export const PhotosMasonry: React.FC<PhotosMasonryProps> = ({ photos }) => {
  const [mounted, setMounted] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const openCarousel = useCallback((index: number) => {
    setCarouselIndex(index)
  }, [])

  const closeCarousel = useCallback(() => {
    setCarouselIndex(null)
  }, [])

  if (!photos?.length) {
    return (
      <p className="text-muted-foreground">
        No photos yet. Select a folder in the page settings and upload images to it in Media.
      </p>
    )
  }

  // Defer Masonry until after hydration - it uses window.innerWidth and produces
  // different layouts on server vs client, causing hydration mismatch
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} onClick={() => openCarousel(index)} />
        ))}
      </div>
    )
  }

  return (
    <>
      <Masonry columns={{ 640: 1, 768: 2, 1024: 3, 1280: 4 }} gap={16}>
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} onClick={() => openCarousel(index)} />
        ))}
      </Masonry>
      {carouselIndex !== null && (
        <PhotoCarousel photos={photos} initialIndex={carouselIndex} onClose={closeCarousel} />
      )}
    </>
  )
}
