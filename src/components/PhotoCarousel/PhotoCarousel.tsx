'use client'

import type { Photo } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import { PhotoInfoDrawer } from '@/components/PhotoCarousel/PhotoInfoDrawer'
import { IconButton } from '@/components/ui/icon-button'
import { ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type PhotoCarouselProps = {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onIndexChange?: (index: number) => void
}

const SWIPE_THRESHOLD = 50
const UI_HIDE_DELAY_MS = 3000

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  initialIndex,
  onClose,
  onIndexChange,
}) => {
  const [index, setIndex] = useState(initialIndex)
  const [uiVisible, setUiVisible] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPhoto = photos[index]
  const isInitialMount = useRef(true)

  // Sync URL when index changes (must run after state update, not inside setState updater)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (typeof onIndexChange === 'function') {
      onIndexChange(index)
    }
  }, [index, onIndexChange])

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1))
  }, [photos.length])
  const next = useCallback(() => {
    setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1))
  }, [photos.length])

  const resetHideTimer = useCallback(() => {
    setUiVisible(true)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    hideTimerRef.current = setTimeout(() => {
      setUiVisible(false)
      hideTimerRef.current = null
    }, UI_HIDE_DELAY_MS)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      resetHideTimer()
      if (e.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false)
        else onClose()
      }
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    },
    [onClose, drawerOpen, resetHideTimer, prev, next],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleMouseMove = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    resetHideTimer()
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
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    resetHideTimer()
  }, [resetHideTimer])

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((o) => !o)
    resetHideTimer()
  }, [resetHideTimer])

  if (!photos?.length) return null

  const uiOverlayClass = uiVisible
    ? 'pointer-events-none opacity-100 transition-opacity duration-200'
    : 'pointer-events-none opacity-0 transition-opacity duration-200'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black overscroll-contain touch-none"
      role="dialog"
      aria-modal="true"
      aria-label="Photo carousel"
      onMouseMove={handleMouseMove}
    >
      {/* Backdrop click to close - only when UI visible and drawer closed */}
      <button
        type="button"
        className="absolute inset-0 z-0"
        onClick={() => {
          if (drawerOpen) setDrawerOpen(false)
          else onClose()
        }}
        aria-label="Close carousel"
      />

      {/* Image strip - absolute inset-0 to guarantee viewport fill, object-cover, touch swipe */}
      <div
        className="absolute inset-0 z-1 overflow-hidden"
        onClick={(e) => {
          if (drawerOpen) {
            setDrawerOpen(false)
          } else if ((e.target as HTMLElement).closest('img')) {
            onClose()
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-x' }}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((p, i) => {
            if (!p || typeof p !== 'object') return null

            return (
              <div key={p.id} className="relative h-full min-w-full shrink-0">
                <MediaComponent
                  resource={p}
                  fill
                  className="relative block size-full"
                  imgClassName="object-contain"
                  priority={i === index}
                  loading={i === index ? 'eager' : 'lazy'}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* UI overlay - hides after timeout, shows on mouse move. pointer-events-none on overlay so touches reach image strip for swipe; buttons have pointer-events-auto */}
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center ${uiOverlayClass}`}
        aria-hidden={!uiVisible}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          className="pointer-events-auto absolute right-4 top-4 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Close carousel"
        >
          <X />
        </IconButton>

        {/* Previous */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation()
            prev()
          }}
          className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Previous photo"
        >
          <ChevronLeft />
        </IconButton>

        {/* Next */}
        <IconButton
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Next photo"
        >
          <ChevronRight />
        </IconButton>

        {/* Bottom center: gallery index + chevron to open drawer */}
        <div
          className={`pointer-events-auto absolute bottom-0 left-1/2 z-30 flex w-full -translate-x-1/2 flex-col items-center gap-1 pb-4 md:max-w-[33vw] ${!drawerOpen ? '' : 'invisible'}`}
        >
          <span className="text-sm text-white/70">
            {index + 1} / {photos.length}
          </span>
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              toggleDrawer()
            }}
            className="text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Open info"
            aria-expanded={false}
          >
            <ChevronUp />
          </IconButton>
        </div>
      </div>

      {/* Photo info drawer - slides over chevron + index when opened */}
      <PhotoInfoDrawer
        photo={currentPhoto}
        open={drawerOpen}
        onToggle={toggleDrawer}
        uiVisible={uiVisible}
      />
    </div>
  )
}
