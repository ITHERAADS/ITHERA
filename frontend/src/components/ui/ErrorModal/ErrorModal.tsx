import { useEffect, useRef } from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onRetry: () => void;
  onClose: () => void;
  errorCode?: string;
}

function IconWarning() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-red-500"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function ErrorModal({
  isOpen,
  title,
  message,
  onRetry,
  onClose,
  errorCode,
}: ErrorModalProps) {
  const retryRef = useRef<HTMLButtonElement>(null);

  // Focus the retry button when modal opens for accessibility
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => retryRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <IconWarning />
          </div>

          {/* Title */}
          <h2
            id="error-modal-title"
            className="font-heading font-bold text-[#1E0A4E] text-lg text-center mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="error-modal-desc"
            className="font-body text-sm text-gray-600 text-center leading-relaxed mb-4"
          >
            {message}
          </p>

          {/* Error code */}
          {errorCode && (
            <p className="font-body text-[11px] text-gray-400 text-center mb-5">
              Código: {errorCode}
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              ref={retryRef}
              onClick={onRetry}
              className="flex-1 sm:flex-none sm:min-w-[120px] bg-[#1E6FD9] hover:bg-[#1A5FBD] text-white font-body font-semibold text-sm rounded-xl px-5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9]"
            >
              Reintentar
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none sm:min-w-[120px] border border-[#E2E8F0] text-[#3D4A5C] font-body font-medium text-sm rounded-xl px-5 py-2.5 hover:bg-[#F8FAFC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
