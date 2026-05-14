import React, { useEffect, useRef, useState } from 'react'
import type { ErrorSeverity } from '../../../constants/errorCodes'

interface ToastProps {
  id: string
  message: string
  severity: ErrorSeverity
  onDismiss: (id: string) => void
}

const severityClasses: Record<ErrorSeverity, string> = {
  low:    'bg-[#35C56A] text-white',
  medium: 'bg-[#F59E0B] text-white',
  high:   'bg-[#EF4444] text-white',
}

export function Toast({ id, message, severity, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = requestAnimationFrame(() => setVisible(true))
    const dismissTimer = setTimeout(() => onDismiss(id), 5000)
    return () => {
      cancelAnimationFrame(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [id, onDismiss])

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-sm',
        'transition-all duration-300',
        severityClasses[severity],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      <span className="flex-1 font-body text-sm leading-snug">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity mt-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13" />
          <line x1="13" y1="1" x2="1" y2="13" />
        </svg>
      </button>
    </div>
  )
}

interface ToastItem {
  id: string
  message: string
  severity: ErrorSeverity
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastsRef = useRef(toasts)
  toastsRef.current = toasts

  function showToast(message: string, severity: ErrorSeverity = 'medium') {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, severity }])
  }

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function ToastContainer() {
    if (toasts.length === 0) return null
    return (
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <Toast key={t.id} id={t.id} message={t.message} severity={t.severity} onDismiss={dismiss} />
        ))}
      </div>
    )
  }

  return { showToast, ToastContainer, dismiss }
}
