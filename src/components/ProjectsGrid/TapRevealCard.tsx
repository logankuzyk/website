'use client'

import React, { useEffect, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

type TapRevealCardProps = {
  children: React.ReactNode
  /** The hover/focus/tap overlay; shown through `group-*` variants and `data-open`. */
  overlay: React.ReactNode
}

/**
 * Card shell that reveals its overlay on hover and keyboard focus (pure CSS, via `group-*`
 * variants) and, on touch, on the first tap. The first tap is swallowed so it can't
 * navigate; once open, taps reach the overlay's links. A tap off a link, or anywhere outside
 * the card, closes it. The card content stays server-rendered: it arrives as `children`.
 */
export const TapRevealCard: React.FC<TapRevealCardProps> = ({ children, overlay }) => {
  const [open, setOpen] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  // The pointer behind the click that is about to be handled; consumed by that click.
  const pointerType = useRef<string>('mouse')

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!card.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  return (
    <div
      ref={card}
      className="group relative flex flex-col overflow-hidden border border-border bg-card"
      data-open={open || undefined}
      data-testid="project-card"
      onClickCapture={(event) => {
        const touch = pointerType.current === 'touch'
        pointerType.current = 'mouse'
        // `detail === 0` is a keyboard (or assistive-tech) activation: never a tap.
        if (!touch || event.detail === 0) return

        if (!open) {
          event.preventDefault()
          setOpen(true)
        } else if (!(event.target as HTMLElement).closest('a')) {
          setOpen(false)
        }
      }}
      onPointerCancelCapture={() => {
        pointerType.current = 'mouse'
      }}
      onPointerDownCapture={(event) => {
        pointerType.current = event.pointerType
      }}
    >
      {children}
      {overlay}
    </div>
  )
}
