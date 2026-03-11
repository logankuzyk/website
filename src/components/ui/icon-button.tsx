import { cn } from '@/utilities/ui'
import * as React from 'react'

const iconButtonVariants = {
  size: {
    default: 'p-2',
    sm: 'p-1.5',
  },
}

export interface IconButtonProps extends React.ComponentProps<'button'> {
  size?: keyof typeof iconButtonVariants.size
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'default', children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center transition-colors [&_svg]:size-6 [&_svg]:shrink-0',
        iconButtonVariants.size[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)

IconButton.displayName = 'IconButton'

export { IconButton }
