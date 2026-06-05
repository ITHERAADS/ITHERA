import type { ReactNode } from "react";

export type ConfirmDialogVariant = "danger" | "warning" | "info" | "success";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const VARIANT_STYLES: Record<
  ConfirmDialogVariant,
  { iconWrapper: string; icon: string; confirmButton: string }
> = {
  danger: {
    iconWrapper: "bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]",
    icon: "!",
    confirmButton: "bg-[#DC2626] text-white hover:bg-[#B91C1C]",
  },
  warning: {
    iconWrapper: "bg-[#FFFBEB] text-[#D97706] ring-[#FDE68A]",
    icon: "!",
    confirmButton: "bg-[#D97706] text-white hover:bg-[#B45309]",
  },
  info: {
    iconWrapper: "bg-[#EFF6FF] text-[#1E6FD9] ring-[#BFDBFE]",
    icon: "i",
    confirmButton: "bg-[#1E6FD9] text-white hover:bg-[#2C8BE6]",
  },
  success: {
    iconWrapper: "bg-[#F0FDF4] text-[#15803D] ring-[#BBF7D0]",
    icon: "✓",
    confirmButton: "bg-[#35C56A] text-white hover:bg-[#2EAE5D]",
  },
};

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
      aria-hidden="true"
    />
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-5 shadow-2xl shadow-[#1E0A4E]/20 ring-1 ring-[#E2E8F0]/70">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ring-1 ${styles.iconWrapper}`}
            aria-hidden="true"
          >
            {styles.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-heading text-lg font-extrabold text-[#1E0A4E]"
            >
              {title}
            </h2>
            <p className="mt-2 font-body text-sm font-medium leading-relaxed text-[#475569]">
              {description}
            </p>
          </div>
        </div>

        {details && (
          <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 font-body text-sm font-semibold text-[#1E0A4E]">
            {details}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-body text-sm font-extrabold text-[#1E0A4E] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-body text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.confirmButton}`}
          >
            {loading && <Spinner />}
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
