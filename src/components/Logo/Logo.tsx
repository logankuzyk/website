import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { className } = props

  return (
    <div
      className={clsx(
        'flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background text-foreground text-sm font-medium',
        className,
      )}
      aria-label="Home"
    >
      LK
    </div>
  )
}
