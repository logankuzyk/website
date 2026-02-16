'use client'

import type { Media } from '@/payload-types'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type PhotoCarouselProps = {
  photos: Media[]
  initialIndex: number
  onClose: () => void
}

const SWIPE_THRESHOLD = 50

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  initialIndex,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const prev = () => setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))
  const next = () => setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')
        setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))
      if (e.key === 'ArrowRight')
        setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))
    },
    [onClose, photos.length],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) next()
      else prev()
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!photos?.length) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Photo carousel"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close carousel"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Backdrop click to close */}
      <button
        type="button"
        className="absolute inset-0 z-0"
        onClick={onClose}
        aria-label="Close carousel"
      />

      {/* Previous */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          prev()
        }}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-10 w-10" />
      </button>

      {/* Image strip with slide animation - close when clicking padding outside image */}
      <div
        className="relative z-1 w-[90vw] overflow-hidden"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('img')) {
            onClose()
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((p) => {
            if (!p || typeof p !== 'object') return null
            const imgUrl = getMediaUrl(p.url, p.updatedAt)
            const imgAlt = typeof p.alt === 'string' ? p.alt : ''
            return (
              <div
                key={p.id}
                className="flex w-[90vw] shrink-0 items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={imgAlt}
                  className="max-h-[90vh] w-auto max-w-[90vw] object-contain"
                  draggable={false}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          next()
        }}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Next photo"
      >
        <ChevronRight className="h-10 w-10" />
      </button>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-sm text-white/70">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}
