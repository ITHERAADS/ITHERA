import React, { useEffect, useRef } from 'react'

interface ErrorModalProps {
  isOpen: boolean
  title: string
  message: string
  errorCode?: string
  onRetry: () => void
  onClose: () => void
}

function WarningIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#FEE2E2" />
      <path
        d="M20 11l9.33 16H10.67L20 11z"
        stroke="#EF4444"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="20" y1="18" x2="20" y2="23" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="26.5" r="1" fill="#EF4444" />
    </svg>
  )
}

export function ErrorModal({ isOpen, title, message, errorCode, onRetry, onClose }: ErrorModalProps) {
  const retryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      retryRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(13,8,32,0.75)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <WarningIcon />
          <h2
            id="error-modal-title"
            className="font-heading font-bold text-lg text-[#3D4A5C]"
          >
            {title}
          </h2>
          <p className="font-body text-sm text-[#7A8799] leading-relaxed">{message}</p>
          {errorCode && (
            <span className="font-body text-xs text-[#7A8799] bg-[#F4F6F8] px-2 py-1 rounded">
              Código: {errorCode}
            </span>
          )}
        </div>

        <div className="flex gap-3 justify-center pt-1">
          <button
            ref={retryRef}
            onClick={onRetry}
            className="bg-[#1E6FD9] text-white rounded-lg px-5 py-2.5 font-heading font-bold text-sm hover:bg-[#2C8BE6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9] focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
          <button
            onClick={onClose}
            className="border border-[#E2E8F0] text-[#3D4A5C] rounded-lg px-5 py-2.5 font-heading font-bold text-sm hover:bg-[#F4F6F8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3D4A5C] focus-visible:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
