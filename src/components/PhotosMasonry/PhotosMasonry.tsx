'use client'

import type { Photo } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import { PhotoCarousel } from '@/components/PhotoCarousel/PhotoCarousel'
import { useSafeQueryReplace } from '@/utilities/useSafeQueryReplace'
import { useSearchParams } from 'next/navigation'
import Masonry from 'react-layout-masonry'
import React, { useCallback, useEffect, useState } from 'react'

type PhotosMasonryProps = {
  photos: Photo[]
}

const PhotoCard = ({ photo, onClick }: { photo: Photo; onClick: () => void }) => (
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
  const safeQueryReplace = useSafeQueryReplace()
  const searchParams = useSearchParams()

  const setPhotoParam = useCallback(
    (photoId: string | null) => {
      safeQueryReplace((sp) => {
        if (photoId) {
          sp.set('photo', photoId)
        } else {
          sp.delete('photo')
        }
      }, false)
    },
    [safeQueryReplace],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Open carousel from URL param ?photo=<id>
  useEffect(() => {
    if (!mounted || !photos?.length) return
    const photoId = searchParams.get('photo')
    if (!photoId) return
    const index = photos.findIndex((p) => p.id === photoId)
    if (index >= 0) {
      setCarouselIndex(index)
    }
  }, [mounted, photos, searchParams])

  const openCarousel = useCallback(
    (index: number) => {
      setCarouselIndex(index)
      const photoId = photos[index]?.id
      if (photoId) setPhotoParam(photoId)
    },
    [photos, setPhotoParam],
  )

  const closeCarousel = useCallback(() => {
    setCarouselIndex(null)
    setPhotoParam(null)
  }, [setPhotoParam])

  const handleIndexChange = useCallback(
    (index: number) => {
      const photoId = photos[index]?.id
      if (photoId) setPhotoParam(photoId)
    },
    [photos, setPhotoParam],
  )

  if (!photos?.length) {
    return (
      <p className="text-muted-foreground">
        No photos yet. Select a folder in the page settings and upload images to it in Photos.
      </p>
    )
  }

  // Defer Masonry until after hydration - it uses window.innerWidth and produces
  // different layouts on server vs client, causing hydration mismatch
  if (!mounted) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} onClick={() => openCarousel(index)} />
        ))}
      </div>
    )
  }

  return (
    <>
      <Masonry columns={{ 640: 1, 768: 2, 1024: 3 }} gap={16} className="w-full">
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} onClick={() => openCarousel(index)} />
        ))}
      </Masonry>
      {carouselIndex !== null && (
        <PhotoCarousel
          photos={photos}
          initialIndex={carouselIndex}
          onClose={closeCarousel}
          onIndexChange={handleIndexChange}
        />
      )}
    </>
  )
}
