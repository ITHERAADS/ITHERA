import type { Toast, ToastType } from "../../../hooks/useToast";

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

const TOAST_STYLES: Record<ToastType, { wrapper: string; icon: string; label: string }> = {
  error: {
    wrapper:
      "bg-[#1C1010] border border-[#7F1D1D]/60 text-[#FECACA] shadow-[0_4px_24px_rgba(220,38,38,0.18)]",
    icon: "⚠️",
    label: "Error",
  },
  warning: {
    wrapper:
      "bg-[#1C1700] border border-[#78350F]/60 text-[#FEF08A] shadow-[0_4px_24px_rgba(234,179,8,0.15)]",
    icon: "🔔",
    label: "Aviso",
  },
  success: {
    wrapper:
      "bg-[#071C12] border border-[#14532D]/60 text-[#BBF7D0] shadow-[0_4px_24px_rgba(22,163,74,0.15)]",
    icon: "✓",
    label: "Listo",
  },
  info: {
    wrapper:
      "bg-[#0A1628] border border-[#1E3A5F]/60 text-[#BAE6FD] shadow-[0_4px_24px_rgba(30,111,217,0.15)]",
    icon: "ℹ",
    label: "Info",
  },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
      style={{ maxWidth: "min(420px, calc(100vw - 2rem))" }}
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            role="alert"
            className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[14px] font-medium backdrop-blur-md transition-all ${style.wrapper}`}
            style={{
              animation: "toast-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <span className="mt-[1px] shrink-0 text-[18px] leading-none" aria-hidden="true">
              {style.icon}
            </span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="ml-1 shrink-0 rounded-full p-1 opacity-60 transition hover:opacity-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}
