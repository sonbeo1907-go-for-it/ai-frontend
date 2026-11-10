"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

export interface ToastContextValue {
  show: (message: string, toneOrOptions?: ToastTone | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, toneOrOptions: ToastTone | ToastOptions = "success") => {
    const id = ++nextToastId;
    const tone: ToastTone =
      typeof toneOrOptions === "string" ? toneOrOptions : toneOrOptions.tone ?? "success";
    const action = typeof toneOrOptions === "object" ? toneOrOptions.action : undefined;
    const duration =
      typeof toneOrOptions === "object" && toneOrOptions.duration
        ? toneOrOptions.duration
        : action
        ? 6000
        : 4200;

    setToasts((current) => [...current, { id, message, tone, action }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), duration);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-[80] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2"
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
                className={`mt-0.5 size-5 shrink-0 ${
                  toast.tone === "success"
                    ? "text-emerald-600"
                    : toast.tone === "error"
                    ? "text-rose-600"
                    : "text-indigo-600"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold leading-5 text-slate-800">
                  {toast.message}
                </p>
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      setToasts((current) => current.filter((item) => item.id !== toast.id));
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-900"
                  >
                    <span>{toast.action.label}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                )}
              </div>
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

export function useOptionalToast() {
  return useContext(ToastContext);
}
