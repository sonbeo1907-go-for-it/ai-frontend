"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  History,
  Info,
  ListChecks,
  MoreHorizontal,
  Pencil,
  SkipForward,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dailyTaskCategoryLabels } from "@/lib/display-labels";
import type { AiAdjustmentAction, DailyPlanItem } from "@/types/api";

function getAdjustmentDisplay(action: AiAdjustmentAction) {
  switch (action) {
    case "CARRY_OVER":
      return { label: "Chuyển từ hôm qua", tone: "amber" as const };
    case "SPLIT":
      return { label: "Đề xuất chia nhỏ", tone: "indigo" as const };
    case "RESCHEDULE":
      return { label: "Đề xuất dời lịch", tone: "sky" as const };
    case "DROP":
      return { label: "Gợi ý bỏ", tone: "rose" as const };
  }
}

interface DailyPlanTaskCardProps {
  item: DailyPlanItem;
  editable: boolean;
  executable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onProgress: () => void;
  onHistory: () => void;
  onPomodoro: () => void;
  onOpenSteps: () => void;
}

export function DailyPlanTaskCard({
  item,
  editable,
  executable,
  onEdit,
  onDelete,
  onProgress,
  onHistory,
  onPomodoro,
  onOpenSteps,
}: DailyPlanTaskCardProps) {
  const status = {
    NOT_STARTED: { label: "Chưa bắt đầu", tone: "slate" as const, icon: Circle },
    IN_PROGRESS: { label: "Đang thực hiện", tone: "indigo" as const, icon: MoreHorizontal },
    COMPLETED: { label: "Hoàn thành", tone: "emerald" as const, icon: Check },
    PARTIALLY_COMPLETED: {
      label: "Hoàn thành một phần",
      tone: "amber" as const,
      icon: CheckCircle2,
    },
    SKIPPED: { label: "Đã bỏ qua", tone: "rose" as const, icon: SkipForward },
  }[item.status];
  const Icon = status.icon;
  const adjustment = item.aiAdjustmentAction ? getAdjustmentDisplay(item.aiAdjustmentAction) : null;
  const steps = item.steps ?? [];
  const stepProgress = item.stepProgress;

  return (
    <Card className={`p-4 sm:p-5 ${item.status === "COMPLETED" ? "bg-emerald-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${
            item.status === "COMPLETED"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-extrabold ${
                item.status === "COMPLETED" ? "text-slate-500 line-through" : "text-slate-950"
              }`}
            >
              {item.title}
            </h3>
            <Badge tone={status.tone}>{status.label}</Badge>
            {adjustment && (
              <Badge tone={adjustment.tone}>
                <Sparkles className="mr-1 inline-block size-3" />
                {adjustment.label}
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
          )}

          {(item.studyUnit || item.learningUnitId) && (
            <div className="mt-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800">
              <p className="font-bold">
                Đơn vị học:{" "}
                {item.studyUnit?.title ?? item.learningUnitTitle ?? item.roadmapItemTitle}
              </p>
              {(item.roadmapItem || item.parentTopicTitle) && (
                <p className="mt-0.5 text-indigo-600">
                  Chủ đề: {item.roadmapItem?.title ?? item.parentTopicTitle}
                </p>
              )}
            </div>
          )}

          {adjustment && item.aiAdjustmentReason && (
            <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-600">
              <Info className="mt-0.5 size-3.5 shrink-0 text-indigo-500" />
              <span>{item.aiAdjustmentReason}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSteps}
            className="focus-ring mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50"
            aria-label={`Mở các bước thực hiện của ${item.title}`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm">
              <ListChecks className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold text-slate-800">
                {steps.length > 0
                  ? `${stepProgress?.completedRequiredCount ?? 0}/${stepProgress?.requiredCount ?? 0} bước bắt buộc`
                  : "Chưa có bước thực hiện"}
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all"
                  style={{ width: `${stepProgress?.completionPercentage ?? 0}%` }}
                />
              </span>
            </span>
            <span className="text-xs font-bold text-indigo-700">
              {steps.length > 0 ? "Xem checklist" : editable ? "Thêm bước" : "Xem chi tiết"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-indigo-500" />
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" />
              {item.plannedMinutes ?? 30} phút
            </span>
            <span>{dailyTaskCategoryLabels[item.category]}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {executable && (
            <>
              <button
                type="button"
                onClick={onPomodoro}
                className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Mở Pomodoro cho ${item.title}`}
                title="Pomodoro"
              >
                <Timer className="size-4" />
              </button>
              <button
                type="button"
                onClick={onProgress}
                className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                aria-label={`Ghi tiến độ của ${item.title}`}
                title="Ghi tiến độ"
              >
                <CheckCircle2 className="size-4" />
              </button>
            </>
          )}

          {item.status !== "NOT_STARTED" && (
            <button
              type="button"
              onClick={onHistory}
              className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              title="Lịch sử tiến độ"
              aria-label={`Xem lịch sử tiến độ của ${item.title}`}
            >
              <History className="size-4" />
            </button>
          )}

          {editable && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                aria-label={`Chỉnh sửa ${item.title}`}
                title="Chỉnh sửa"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Xóa ${item.title}`}
                title="Xóa"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
