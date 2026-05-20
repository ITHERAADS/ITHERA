import { useCallback, useRef, useState } from "react";

export type ToastType = "error" | "warning" | "success" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

const DEFAULT_DURATION_MS = 5000;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info", durationMs = DEFAULT_DURATION_MS) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, durationMs);

      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  return { toasts, show, dismiss };
}
