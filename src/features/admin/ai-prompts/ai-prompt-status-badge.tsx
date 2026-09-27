import type { AiPromptStatus } from "@/types/api";
import { Archive, CheckCircle2, FileEdit, Star } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StatusConfig {
  label: string;
  ariaLabel: string;
  icon: typeof Star;
  className: string;
}

export const PROMPT_STATUS_CONFIG: Record<AiPromptStatus, StatusConfig> = {
  ACTIVE: {
    label: "ACTIVE ★",
    ariaLabel: "Trạng thái: Đang hoạt động (ACTIVE)",
    icon: Star,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm font-black",
  },
  DRAFT: {
    label: "DRAFT ✎",
    ariaLabel: "Trạng thái: Bản nháp (DRAFT)",
    icon: FileEdit,
    className: "border-amber-300 bg-amber-50 text-amber-800 font-semibold",
  },
  PUBLISHED: {
    label: "PUBLISHED",
    ariaLabel: "Trạng thái: Đã phát hành (PUBLISHED)",
    icon: CheckCircle2,
    className: "border-sky-300 bg-sky-50 text-sky-800 font-semibold",
  },
  ARCHIVED: {
    label: "ARCHIVED",
    ariaLabel: "Trạng thái: Đã lưu trữ (ARCHIVED)",
    icon: Archive,
    className: "border-slate-300 bg-slate-100 text-slate-600 font-medium",
  },
};

export function AiPromptStatusBadge({
  status,
  className,
}: {
  status: AiPromptStatus;
  className?: string;
}) {
  const config = PROMPT_STATUS_CONFIG[status] ?? PROMPT_STATUS_CONFIG.DRAFT;
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        config.className,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
