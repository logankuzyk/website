'use client'

import { cn } from '@/utilities/ui'
import React from 'react'

type ImagePlaceholderProps = {
  className?: string
}

/**
 * A dot grid placeholder shown while images load.
 * Background: slightly darker than page background in light mode, slightly lighter in dark mode.
 * Dots: 0.5px gray circles, 16px gap. 1px border matching the design system.
 */
export function ImagePlaceholder({ className }: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 border border-border bg-[var(--image-placeholder-bg)]',
        '[background-image:radial-gradient(circle,var(--image-placeholder-dot)_0.5px,transparent_0.5px)] [background-size:16.5px_16.5px]',
        className,
      )}
      aria-hidden
    />
  )
}
