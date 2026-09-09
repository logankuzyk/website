'use client'

import type { ImageLoader, StaticImageData } from 'next/image'

import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { cn } from '@/utilities/ui'
import NextImage from 'next/image'
import React, { useMemo, useState } from 'react'

import type { Props as MediaProps } from '../types'

import { collectImageCandidates, pickImageCandidate } from '@/utilities/buildImageSrcSet'
import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * ImageMedia
 *
 * This component passes a **relative** `src` (e.g. `/media/...`) to Next.js Image.
 * The `getMediaUrl` utility constructs the full URL by prepending the base URL from env vars
 * (NEXT_PUBLIC_SERVER_URL). Next.js then optimizes this using `remotePatterns` configured
 * in next.config.js — no custom `loader` needed.
 *
 * Flow:
 *   1. Resource URL from Payload: `/media/image-123.jpg`
 *   2. getMediaUrl() adds base URL: `https://yourdomain.com/media/image-123.jpg`
 *   3. Next.js Image optimizes via remotePatterns: `/_next/image?url=...&w=1200&q=75`
 *
 * If your storage/plugin returns **external CDN URLs** (e.g. `https://cdn.example.com/...`),
 * choose ONE of the following:
 *   A) Allow the remote host in next.config.js:
 *      images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] }
 *   B) Provide a **custom loader** for CDN-specific transforms:
 *      const imageLoader: ImageLoader = ({ src, width, quality }) =>
 *        `https://cdn.example.com${src}?w=${width}&q=${quality ?? 75}`
 *      <Image loader={imageLoader} src="/media/hero.jpg" width={1200} height={600} alt="" />
 *   C) Skip optimization:
 *      <Image unoptimized src="https://cdn.example.com/hero.jpg" width={1200} height={600} alt="" />
 *
 * TL;DR: Template uses relative URLs + getMediaUrl() to construct full URLs, then relies on
 * remotePatterns for optimization. Only add `loader` if using external CDNs with custom transforms.
 */

export const ImageMedia: React.FC<MediaProps> = (props) => {
  const {
    alt: altFromProps,
    fill,
    pictureClassName,
    imgClassName,
    imgStyle,
    onLoad,
    priority,
    resource,
    size: sizeFromProps,
    src: srcFromProps,
    loading: loadingFromProps,
  } = props

  const [loaded, setLoaded] = useState(false)

  const resourceObject = !srcFromProps && resource && typeof resource === 'object' ? resource : null

  let width: number | undefined
  let height: number | undefined
  let alt = altFromProps
  let src: StaticImageData | string = srcFromProps || ''

  if (resourceObject) {
    width = resourceObject.width ?? undefined
    height = resourceObject.height ?? undefined
    alt = resourceObject.alt || ''
    src = getMediaUrl(resourceObject.url, resourceObject.updatedAt)
  }

  // When images are served from our R2/CDN (STORAGE_URL) there is no Next.js optimizer in the
  // path. Instead we hand Next.js a loader that maps each requested width to the closest
  // pre-generated (WebP) rendition, so it still emits a real srcSet from the CDN.
  const storageBase = process.env.NEXT_PUBLIC_STORAGE_URL?.replace(/\/$/, '')
  const isStorageUrl = Boolean(
    typeof src === 'string' &&
      storageBase &&
      (() => {
        try {
          return new URL(src).origin === new URL(storageBase).origin
        } catch {
          return false
        }
      })(),
  )

  const candidates = useMemo(
    () => (resourceObject ? collectImageCandidates(resourceObject) : []),
    [resourceObject],
  )

  const cacheTag = resourceObject?.updatedAt

  const storageLoader = useMemo<ImageLoader | undefined>(() => {
    if (!isStorageUrl || candidates.length < 2) return undefined
    return ({ width: requestedWidth }) =>
      getMediaUrl(pickImageCandidate(candidates, requestedWidth) ?? candidates[candidates.length - 1].url, cacheTag)
  }, [isStorageUrl, candidates, cacheTag])

  const loading = loadingFromProps || (!priority ? 'lazy' : undefined)

  // Drives which srcSet candidate the browser downloads. Callers that render an image at a
  // known box size (e.g. a grid tile) should pass an explicit `size` like "320px"; the
  // honest default otherwise is full viewport width.
  const sizes = sizeFromProps || '100vw'

  const handleLoad = React.useCallback(() => {
    setLoaded(true)
    onLoad?.()
  }, [onLoad])

  return (
    <picture className={cn('relative block size-full overflow-hidden', pictureClassName)}>
      <ImagePlaceholder
        className={cn(
          'z-[1] transition-opacity duration-300',
          loaded && 'pointer-events-none opacity-0',
        )}
      />
      <NextImage
        alt={alt || ''}
        className={cn(imgClassName)}
        style={imgStyle}
        fill={fill}
        height={!fill ? height : undefined}
        loader={storageLoader}
        onLoad={handleLoad}
        onLoadingComplete={handleLoad}
        placeholder="empty"
        priority={priority}
        quality={100}
        loading={loading}
        sizes={sizes}
        src={src}
        // Only bypass optimization entirely when we have no rendition ladder to build a
        // srcSet from (single candidate); otherwise `storageLoader` handles CDN delivery.
        unoptimized={isStorageUrl && !storageLoader}
        width={!fill ? width : undefined}
      />
    </picture>
  )
}
