import React from 'react'

interface InlineBannerProps {
  message: string
  onDismiss?: () => void
}

function WarningTriangle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0 mt-0.5">
      <path
        d="M9 2L16.5 15H1.5L9 2z"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="9" y1="7.5" x2="9" y2="11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="13" r="0.75" fill="#F59E0B" />
    </svg>
  )
}

export function InlineBanner({ message, onDismiss }: InlineBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 bg-amber-50 border-l-4 border-[#F59E0B] rounded-r-lg px-4 py-3"
    >
      <WarningTriangle />
      <p className="flex-1 font-body text-sm text-[#3D4A5C] leading-snug">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="flex-shrink-0 text-[#7A8799] hover:text-[#3D4A5C] transition-colors mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
      )}
    </div>
  )
}
