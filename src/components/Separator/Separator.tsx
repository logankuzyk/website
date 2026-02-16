import React from 'react'

import { cn } from '@/utilities/ui'

type SeparatorProps = {
  className?: string
}

export const Separator: React.FC<SeparatorProps> = ({ className }) => (
  <div
    className={cn('mt-4 h-px w-full bg-foreground/20', className)}
    aria-hidden
  />
)
