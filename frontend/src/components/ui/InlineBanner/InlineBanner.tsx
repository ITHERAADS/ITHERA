interface InlineBannerProps {
  message: string;
  severity?: 'medium';
  onDismiss?: () => void;
}

function IconAlertTriangle() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
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

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function InlineBanner({ message, severity = 'medium', onDismiss }: InlineBannerProps) {
  void severity; // reserved for future severity variants

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-amber-800"
    >
      <IconAlertTriangle />
      <p className="font-body text-sm flex-1 leading-snug">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
          aria-label="Cerrar aviso"
        >
          <IconX />
        </button>
      )}
    </div>
  );
}
