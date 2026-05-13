import { useState, useEffect, useCallback } from 'react';

export type ToastSeverity = 'low' | 'medium' | 'high';

interface ToastProps {
  message: string;
  severity: ToastSeverity;
  onDismiss: () => void;
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration?: number;
}

const SEVERITY_STYLES: Record<ToastSeverity, string> = {
  low:    'bg-green-50  text-green-800  border border-green-200',
  medium: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  high:   'bg-red-50    text-red-800    border border-red-200',
};

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function Toast({ message, severity, onDismiss, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Slide in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for exit animation before removing from DOM
      const exitTimer = setTimeout(onDismiss, 300);
      return () => clearTimeout(exitTimer);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  function handleClose() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-full',
        'transition-all duration-300 ease-out',
        SEVERITY_STYLES[severity],
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      <p className="font-body text-sm flex-1 leading-snug">{message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Cerrar notificación"
      >
        <IconX />
      </button>
    </div>
  );
}

// ── useToast hook ─────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'low', duration?: number) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, severity, duration }]);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ToastContainer is returned as a render function, not a JSX component,
  // to avoid React remounting on every re-render. Call it as {ToastContainer()}
  // rather than <ToastContainer /> in your JSX.
  const ToastContainer = useCallback(
    () => (
      <div
        aria-label="Notificaciones del sistema"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
      >
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              severity={t.severity}
              duration={t.duration}
              onDismiss={() => dismiss(t.id)}
            />
          ))}
        </div>
      </div>
    ),
    [toasts, dismiss]
  );

  return { showToast, ToastContainer, dismiss };
}
