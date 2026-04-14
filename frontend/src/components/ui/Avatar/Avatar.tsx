import { useState } from 'react'
import type { Size } from '../../../types'

export interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Avatar({ src, alt, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError

  return (
    <div
      className={[
        'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
        'bg-blue text-white font-body font-medium select-none',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-label={alt ?? name}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? ''}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  )
}
