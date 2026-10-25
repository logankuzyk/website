'use client'

import React, { useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

type TapRevealCardProps = {
  children: React.ReactNode
  /** The hover/focus/tap overlay; shown through `group-*` and `data-open` variants. */
  overlay: React.ReactNode
  className?: string
}

/**
 * Card shell that reveals its overlay on hover and keyboard focus (pure CSS, via `group-*`
 * variants) and, on touch, on the first tap. The first tap is swallowed so it can't
 * navigate; once open, taps reach the overlay's links, and a tap off a link closes it.
 * The card content stays server-rendered: it arrives here as `children`.
 */
export const TapRevealCard: React.FC<TapRevealCardProps> = ({ children, overlay, className }) => {
  const [open, setOpen] = useState(false)
  const pointerType = useRef<string>('mouse')

  return (
    <div
      className={cn('group relative flex flex-col overflow-hidden border border-border bg-card', className)}
      data-open={open || undefined}
      data-testid="project-card"
      onClickCapture={(event) => {
        if (pointerType.current !== 'touch') return
        const onLink = (event.target as HTMLElement).closest('a')
        if (!open) {
          event.preventDefault()
          setOpen(true)
        } else if (!onLink) {
          setOpen(false)
        }
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
