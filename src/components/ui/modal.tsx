"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
  closeDisabled?: boolean;
  confirmClose?: boolean;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-lg",
  closeDisabled = false,
  confirmClose = false,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeOptionsRef = useRef({
    closeDisabled,
    confirmClose,
    onClose,
  });

  useEffect(() => {
    closeOptionsRef.current = {
      closeDisabled,
      confirmClose,
      onClose,
    };
  }, [closeDisabled, confirmClose, onClose]);

  const requestClose = useCallback(() => {
    const closeOptions = closeOptionsRef.current;

    if (closeOptions.closeDisabled) return;
    if (
      closeOptions.confirmClose &&
      !window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng cửa sổ này?")
    ) {
      return;
    }
    closeOptions.onClose();
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const currentFocus = document.activeElement as HTMLElement | null;
      const focusAlreadyInside =
        currentFocus && dialogRef.current?.contains(currentFocus) ? currentFocus : null;
      const preferred = dialogRef.current?.querySelector<HTMLElement>(
        "[data-modal-initial-focus], [autofocus]",
      );
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

      (preferred ?? focusAlreadyInside ?? first ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", listener);

    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [open, requestClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        aria-busy={closeDisabled}
        className={`animate-fade-up max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-3xl border border-white/30 bg-white shadow-2xl ${width}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-slate-950">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={requestClose}
            disabled={closeDisabled}
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
