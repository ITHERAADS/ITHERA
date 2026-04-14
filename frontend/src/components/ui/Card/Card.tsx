import React from 'react'

export interface CardProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  onClick?: () => void
}

const paddingClasses: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-6',
}

const shadowClasses: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm:   'shadow-sm',
  md:   'shadow-md',
  lg:   'shadow-lg',
}

export function Card({
  header,
  footer,
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  border = true,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl overflow-hidden',
        border ? 'border border-gray-200' : '',
        shadowClasses[shadow],
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : '',
        className,
      ].join(' ')}
    >
      {header && (
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="font-heading text-base font-semibold text-primary-dark">{header}</div>
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-gray-100 bg-background rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  )
}
