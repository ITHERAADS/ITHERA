import logoWhite from '../../../assets/logo-white.png'
import logoColor from '../../../assets/logo-color.jpg'

export interface LogoProps {
  /** 'white' para fondos oscuros, 'color' para fondos claros */
  variant?: 'white' | 'color'
  height?: number
  className?: string
}

export function Logo({ variant = 'color', height = 36, className = '' }: LogoProps) {
  const src = variant === 'white' ? logoWhite : logoColor
  const alt = 'Ithera'

  return (
    <img
      src={src}
      alt={alt}
      style={{ height }}
      className={`w-auto object-contain select-none ${className}`}
      draggable={false}
    />
  )
}
