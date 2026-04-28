import React from 'react'
import type { BadgeVariant } from '../../../types'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green/15 text-green border border-green/30',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  error:   'bg-error/15 text-error border border-error/30',
  info:    'bg-blue/15 text-blue border border-blue/30',
}

const dotClasses: Record<BadgeVariant, string> = {
  success: 'bg-green',
  warning: 'bg-yellow-500',
  error:   'bg-error',
  info:    'bg-blue',
}

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({
  variant = 'info',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-body font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClasses[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
