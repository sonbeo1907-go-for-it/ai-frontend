"use client";

import { AlertTriangle, Info, LoaderCircle, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export type ConfirmDialogTone = "danger" | "warning" | "primary";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  loading?: boolean;
}

export function AiPromptConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "primary",
  loading = false,
}: ConfirmDialogProps) {
  const ToneIcon =
    tone === "danger" ? ShieldAlert : tone === "warning" ? AlertTriangle : Info;

  const iconClasses = {
    danger: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    primary: "bg-indigo-100 text-indigo-700",
  }[tone];

  const confirmVariant =
    tone === "danger" ? "danger" : tone === "warning" ? "primary" : "primary";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      width="max-w-md"
      closeDisabled={loading}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${iconClasses}`}
            aria-hidden="true"
          >
            <ToneIcon className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang xử lý…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
