'use client'

import type { Photo } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import { PhotoInfoDrawer } from '@/components/PhotoCarousel/PhotoInfoDrawer'
import { IconButton } from '@/components/ui/icon-button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type PhotoCarouselProps = {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onIndexChange?: (index: number) => void
  carouselEnabled?: boolean
}

const SWIPE_THRESHOLD = 50
const UI_HIDE_DELAY_MS = 3000

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
  photos,
  initialIndex,
  onClose,
  onIndexChange,
  carouselEnabled = true,
}) => {
  const [index, setIndex] = useState(initialIndex)
  const [uiVisible, setUiVisible] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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
    setIndex((current) => (current <= 0 ? photos.length - 1 : current - 1))
  }, [photos.length])
  const next = useCallback(() => {
    setIndex((current) => (current >= photos.length - 1 ? 0 : current + 1))
  }, [photos.length])

  const resetHideTimer = useCallback((): void => {
    setUiVisible(true)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      // Never hide controls out from under keyboard focus; re-arm instead.
      if (hasKeyboardFocus(dialogRef.current)) {
        resetHideTimer()
        return
      }
      setUiVisible(false)
    }, UI_HIDE_DELAY_MS)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      resetHideTimer()
      // Escape is handled by the dialog's native `cancel` event (see handleCancel).
      if (carouselEnabled) {
        if (event.key === 'ArrowLeft') prev()
        if (event.key === 'ArrowRight') next()
      }
    },
    [resetHideTimer, prev, next, carouselEnabled],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleMouseMove = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX
    resetHideTimer()
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    touchEndX.current = event.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!carouselEnabled) return
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

  // Open as a native modal dialog: the browser makes everything outside it inert (no
  // reliance on aria-modal support), traps Tab inside, and moves focus to the first control.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    // The browser can close the dialog itself (e.g. a second Escape press); keep React in sync.
    const handleNativeClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleNativeClose)
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '') // jsdom

    return () => {
      dialog.removeEventListener('close', handleNativeClose)
      if (typeof dialog.close === 'function') dialog.close()
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  const handleCancel = useCallback(
    (event: React.SyntheticEvent) => {
      // Escape: close the info drawer first, then the carousel.
      event.preventDefault()
      if (drawerOpen) setDrawerOpen(false)
      else onClose()
    },
    [drawerOpen, onClose],
  )

  useEffect(() => {
    resetHideTimer()
  }, [resetHideTimer])

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((open) => !open)
    resetHideTimer()
  }, [resetHideTimer])

  if (!photos?.length) return null

  const uiOverlayClass = uiVisible
    ? 'pointer-events-none opacity-100 transition-opacity duration-200 motion-reduce:transition-none'
    : 'pointer-events-none opacity-0 transition-opacity duration-200 motion-reduce:transition-none'

  const announcement = `Photo ${index + 1} of ${photos.length}${currentPhoto?.alt ? `: ${currentPhoto.alt}` : ''}`

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex size-full max-h-none max-w-none flex-col overflow-hidden border-0 bg-black p-0 overscroll-contain touch-none"
      aria-label="Photo carousel"
      onCancel={handleCancel}
      onMouseMove={handleMouseMove}
      onFocus={resetHideTimer}
    >
      {/* Announce slide changes to screen readers (focus stays on the prev/next buttons) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {carouselEnabled ? announcement : ''}
      </div>

      {/* Image strip - absolute inset-0 to guarantee viewport fill, object-cover, touch swipe.
          Pointer-only click target (clicking the photo or backdrop closes); keyboard users have
          the Close button and Escape. */}
      <div
        className="absolute inset-0 z-1 overflow-hidden"
        onClick={() => {
          if (drawerOpen) setDrawerOpen(false)
          else onClose()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: carouselEnabled ? 'pan-x' : 'auto' }}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
          aria-roledescription={carouselEnabled ? 'carousel' : undefined}
        >
          {photos.map((photo, photoIndex) => {
            if (!photo || typeof photo !== 'object') return null

            return (
              <div
                key={photo.id}
                className="relative h-full min-w-full shrink-0"
                role="group"
                aria-roledescription="slide"
                aria-label={`${photoIndex + 1} of ${photos.length}`}
                // Off-screen slides are removed from the accessibility tree
                inert={photoIndex !== index}
              >
                <MediaComponent
                  resource={photo}
                  fill
                  className="relative block size-full"
                  imgClassName="object-contain"
                  priority={photoIndex === index}
                  loading={photoIndex === index ? 'eager' : 'lazy'}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* UI overlay - hides after timeout, shows on mouse move. pointer-events-none on overlay so touches reach image strip for swipe; buttons have pointer-events-auto */}
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center ${uiOverlayClass}`}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          className="pointer-events-auto absolute right-4 top-4 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Close carousel"
        >
          <X />
        </IconButton>

        {/* Previous - only when carousel enabled */}
        {carouselEnabled && (
          <IconButton
            onClick={(event) => {
              event.stopPropagation()
              prev()
            }}
            className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Previous photo"
          >
            <ChevronLeft />
          </IconButton>
        )}

        {/* Next - only when carousel enabled */}
        {carouselEnabled && (
          <IconButton
            onClick={(event) => {
              event.stopPropagation()
              next()
            }}
            className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Next photo"
          >
            <ChevronRight />
          </IconButton>
        )}

      </div>

      {/* Photo info drawer - toggle bar stays fixed at bottom, content expands above */}
      <PhotoInfoDrawer
        photo={currentPhoto}
        open={drawerOpen}
        onToggle={toggleDrawer}
        uiVisible={uiVisible}
        index={index}
        total={photos.length}
        carouselEnabled={carouselEnabled}
      />
    </dialog>
  )
}

/** True when a control inside `root` has keyboard-visible focus (not a mouse click). */
function hasKeyboardFocus(root: HTMLElement | null): boolean {
  if (!root) return false
  try {
    return root.querySelector(':focus-visible') !== null
  } catch {
    return false
  }
}
