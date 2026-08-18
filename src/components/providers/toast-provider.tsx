"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}
const ToastContext = createContext<{ show: (message: string, tone?: ToastTone) => void } | null>(
  null,
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? CircleAlert : Info;
          return (
            <div
              key={toast.id}
              className="animate-fade-up flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              <Icon
                className={`mt-0.5 size-5 shrink-0 ${toast.tone === "success" ? "text-emerald-600" : toast.tone === "error" ? "text-rose-600" : "text-indigo-600"}`}
              />
              <p className="flex-1 text-sm font-semibold leading-5 text-slate-700">
                {toast.message}
              </p>
              <button
                onClick={() =>
                  setToasts((current) => current.filter((item) => item.id !== toast.id))
                }
                className="text-slate-400 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
