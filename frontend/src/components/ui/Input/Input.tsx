import React, { useId } from 'react'
import type { Size } from '../../../types'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  size?: Size
  containerClassName?: string
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
}

export function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  size = 'md',
  containerClassName = '',
  id: idProp,
  className = '',
  disabled,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const helperId = `${id}-helper`
  const hasError = !!error

  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="font-body text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          {...rest}
          id={id}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? helperId : undefined}
          className={[
            'w-full font-body bg-white border rounded-lg outline-none transition-colors duration-150',
            'focus:ring-2 focus:ring-offset-0',
            hasError
              ? 'border-error focus:border-error focus:ring-error/30'
              : 'border-gray-300 focus:border-blue focus:ring-blue/30',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            sizeClasses[size],
            className,
          ].join(' ')}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {(error || helperText) && (
        <p id={helperId} className={`font-body text-xs ${hasError ? 'text-error' : 'text-gray-500'}`}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
