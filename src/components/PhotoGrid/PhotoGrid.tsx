'use client'

import type { Photo } from '@/payload-types'

import { Media as MediaComponent } from '@/components/Media'
import { PhotoCarousel } from '@/components/PhotoCarousel/PhotoCarousel'
import { useSafeQueryReplace } from '@/utilities/useSafeQueryReplace'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useSearchParams } from 'next/navigation'
import Masonry from 'react-layout-masonry'
import Link from 'next/link'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

export type PhotoGridItem =
  | { type: 'photo'; photo: Photo }
  | { type: 'collection'; photo: Photo; collectionName: string; href: string }

type PhotoGridProps = {
  items: PhotoGridItem[]
  masonry?: boolean
  cropToSquare?: boolean
  showCollectionNames?: boolean
  enableFullScreen?: boolean
  enableCarousel?: boolean
  emptyMessage?: string
  limit?: number
  overscan?: number
}

const GAP = 16
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024 } as const

function getColumns(width: number): number {
  if (width < BREAKPOINTS.sm) return 1
  if (width < BREAKPOINTS.lg) return 2
  return 3
}

const gridClassName = 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  items,
  masonry = true,
  cropToSquare = false,
  showCollectionNames = true,
  enableFullScreen = true,
  enableCarousel = true,
  emptyMessage,
  limit,
  overscan = 2,
}) => {
  const [mounted, setMounted] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const safeQueryReplace = useSafeQueryReplace()
  const searchParams = useSearchParams()

  const limitedItems = limit != null && limit > 0 ? items.slice(0, limit) : items
  const photoItems = limitedItems.filter((i): i is Extract<PhotoGridItem, { type: 'photo' }> => i.type === 'photo')
  const photosForCarousel = photoItems.map((i) => i.photo)

  const shouldVirtualize = cropToSquare || !masonry

  const columns = useMemo(() => getColumns(containerWidth || 1024), [containerWidth])
  const rowCount = Math.ceil(limitedItems.length / columns) || 0
  const itemWidth = containerWidth > 0 ? (containerWidth - (columns - 1) * GAP) / columns : 300
  const rowHeight = cropToSquare ? itemWidth : itemWidth / (16 / 9)

  const virtualizer = useWindowVirtualizer({
    count: shouldVirtualize ? rowCount : 0,
    estimateSize: () => rowHeight,
    overscan,
    gap: GAP,
    scrollMargin,
    getItemKey: (index) => index,
  })

  useLayoutEffect(() => {
    if (!gridRef.current) return
    const el = gridRef.current
    const updateScrollMargin = () => {
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
    }
    updateScrollMargin()
    const ro = new ResizeObserver(updateScrollMargin)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  useLayoutEffect(() => {
    if (!gridRef.current) return
    const el = gridRef.current
    const updateWidth = () => setContainerWidth(el.offsetWidth)
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  useEffect(() => {
    virtualizer.measure()
  }, [columns, rowHeight, virtualizer])

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

  useEffect(() => {
    if (!mounted || !photoItems.length) return
    const photoId = searchParams.get('photo')
    if (!photoId) return
    const index = photoItems.findIndex((p) => p.photo.id === photoId)
    if (index >= 0) {
      setCarouselIndex(index)
      if (shouldVirtualize && virtualizer) {
        const globalIndex = limitedItems.findIndex(
          (item) => item.type === 'photo' && item.photo.id === photoId
        )
        if (globalIndex >= 0) {
          const rowIndex = Math.floor(globalIndex / columns)
          virtualizer.scrollToIndex(rowIndex, { align: 'center' })
        }
      }
    }
  }, [mounted, photoItems, limitedItems, searchParams, shouldVirtualize, virtualizer, columns])

  const openCarousel = useCallback(
    (index: number) => {
      setCarouselIndex(index)
      const photoId = photoItems[index]?.photo.id
      if (photoId) setPhotoParam(photoId)
    },
    [photoItems, setPhotoParam],
  )

  const closeCarousel = useCallback(() => {
    setCarouselIndex(null)
    setPhotoParam(null)
  }, [setPhotoParam])

  const handleIndexChange = useCallback(
    (index: number) => {
      const photoId = photoItems[index]?.photo.id
      if (photoId) setPhotoParam(photoId)
    },
    [photoItems, setPhotoParam],
  )

  const imageWrapperClass = cropToSquare
    ? 'relative aspect-square w-full overflow-hidden'
    : 'w-full overflow-hidden'
  const imgClass = cropToSquare
    ? 'object-cover object-center size-full'
    : 'w-full h-auto object-cover'

  const cardBaseClass =
    'w-full overflow-hidden g-card text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

  const renderPhotoCard = (item: Extract<PhotoGridItem, { type: 'photo' }>, index: number) => {
    const content = (
      <div className={imageWrapperClass}>
        <MediaComponent
          resource={item.photo}
          imgClassName={imgClass}
          fill={cropToSquare}
          {...(cropToSquare && { className: 'relative block size-full' })}
        />
      </div>
    )

    if (!enableFullScreen) {
      return (
        <div key={item.photo.id} className={cardBaseClass}>
          {content}
        </div>
      )
    }

    return (
      <button
        key={item.photo.id}
        type="button"
        onClick={() => openCarousel(index)}
        className={`cursor-pointer ${cardBaseClass}`}
      >
        {content}
      </button>
    )
  }

  const renderCollectionCard = (item: Extract<PhotoGridItem, { type: 'collection' }>) => {
    const content = (
      <>
        <div className={imageWrapperClass}>
          <MediaComponent
            resource={item.photo}
            imgClassName={imgClass}
            fill={cropToSquare}
            {...(cropToSquare && { className: 'relative block size-full' })}
          />
        </div>
        {showCollectionNames && (
          <span className="mt-2 block text-left text-sm font-medium">{item.collectionName}</span>
        )}
      </>
    )

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`block cursor-pointer ${cardBaseClass}`}
      >
        {content}
      </Link>
    )
  }

  const renderItem = (item: PhotoGridItem, index: number) => {
    if (item.type === 'photo') {
      return renderPhotoCard(item, index)
    }
    return renderCollectionCard(item)
  }

  const isEmpty = !limitedItems.length

  if (isEmpty) {
    return (
      <p className="text-muted-foreground">
        {emptyMessage ??
          'No photos yet. Select a folder in the page settings and upload images to it in Photos.'}
      </p>
    )
  }

  const carousel = enableFullScreen && carouselIndex !== null && photoItems.length > 0 && (
    <PhotoCarousel
      photos={photosForCarousel}
      initialIndex={carouselIndex}
      onClose={closeCarousel}
      onIndexChange={handleIndexChange}
      carouselEnabled={enableCarousel}
    />
  )

  if (!mounted) {
    return (
      <>
        <div ref={gridRef} className={gridClassName}>
          {limitedItems.map((item, index) => renderItem(item, index))}
        </div>
        {carousel}
      </>
    )
  }

  if (shouldVirtualize && rowCount > 0) {
    const virtualItems = virtualizer.getVirtualItems()
    return (
      <>
        <div ref={gridRef} className="w-full">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const startIndex = virtualRow.index * columns
              const rowItems = limitedItems.slice(startIndex, startIndex + columns)
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
                  }}
                  className={`grid w-full gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
                >
                  {rowItems.map((item, colIndex) => {
                    const itemIndex = startIndex + colIndex
                    return (
                      <div key={item.type === 'photo' ? item.photo.id : item.href} className="w-full">
                        {renderItem(item, itemIndex)}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
        {carousel}
      </>
    )
  }

  const gridContent = limitedItems.map((item, index) => renderItem(item, index))

  if (!masonry) {
    return (
      <>
        <div ref={gridRef} className={gridClassName}>
          {gridContent}
        </div>
        {carousel}
      </>
    )
  }

  return (
    <>
      <div ref={gridRef} className="w-full">
        <Masonry columns={{ 640: 1, 768: 2, 1024: 3 }} gap={16} className="w-full">
          {gridContent}
        </Masonry>
      </div>
      {carousel}
    </>
  )
}
