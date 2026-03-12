import React from 'react'

import { cn } from '@/utilities/ui'

type SeparatorProps = {
  className?: string
}

export const Separator: React.FC<SeparatorProps> = ({ className }) => (
  <div
    className={cn('mt-4 w-full border-t border-border', className)}
    aria-hidden
  />
)
