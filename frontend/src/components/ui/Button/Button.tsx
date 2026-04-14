import React from 'react'
import type { ButtonVariant, Size } from '../../../types'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: Size
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-primary-dark text-white hover:bg-primary focus-visible:ring-primary',
  secondary: 'bg-primary text-white hover:bg-purple focus-visible:ring-purple',
  outline:   'border border-primary-dark text-primary-dark bg-transparent hover:bg-primary-dark hover:text-white focus-visible:ring-primary-dark',
  ghost:     'text-primary-dark bg-transparent hover:bg-primary-dark/10 focus-visible:ring-primary-dark',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 flex-shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={[
        'inline-flex items-center justify-center font-body font-medium rounded-lg',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {isLoading ? <Spinner /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
}
