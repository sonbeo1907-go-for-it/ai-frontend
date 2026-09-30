"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  GripVertical,
  HelpCircle,
  History,
  Info,
  Lightbulb,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { dailyTaskCategoryLabels } from "@/lib/display-labels";
import type { AiAdjustmentAction, DailyPlanItem, DailyTaskStatus } from "@/types/api";

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

export interface DailyPlanKanbanBoardProps {
  items: DailyPlanItem[];
  editable: boolean;
  executable: boolean;
  onMoveStatus: (
    itemId: string,
    newStatus: DailyTaskStatus,
    actualMinutes?: number,
    manualFallbackReason?: string,
  ) => Promise<void>;
  onAddTask: () => void;
  onEditTask: (item: DailyPlanItem) => void;
  onDeleteTask: (item: DailyPlanItem) => void;
  onProgress?: (item: DailyPlanItem) => void;
  onHistory?: (item: DailyPlanItem) => void;
  onPomodoro?: (item: DailyPlanItem) => void;
  onOpenSteps?: (item: DailyPlanItem) => void;
  onCorrection?: (item: DailyPlanItem) => void;
  quizPassed?: boolean;
  quizScore?: number | null;
  onOpenQuiz?: (item?: DailyPlanItem) => void;
}

export type ColumnKey = "NOT_STARTED" | "IN_PROGRESS" | "REVIEWING" | "COMPLETED";

interface ColumnDef {
  key: ColumnKey;
  title: string;
  badgeTone: "slate" | "indigo" | "amber" | "emerald";
  dotColor: string;
  headerBorder: string;
  columnBg: string;
  columnBorder: string;
  filterStatuses: DailyTaskStatus[];
  emptyIcon: "circle" | "play" | "help" | "check";
  emptyText: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "NOT_STARTED",
    title: "Chưa hoàn thành",
    badgeTone: "slate",
    dotColor: "bg-slate-400",
    headerBorder: "border-slate-200",
    columnBg: "bg-slate-50/70",
    columnBorder: "border-slate-200/80 hover:border-slate-300",
    filterStatuses: ["NOT_STARTED", "SKIPPED"],
    emptyIcon: "circle",
    emptyText: "Không có nhiệm vụ chờ",
  },
  {
    key: "IN_PROGRESS",
    title: "Đang thực hiện",
    badgeTone: "indigo",
    dotColor: "bg-indigo-600 animate-pulse",
    headerBorder: "border-indigo-200",
    columnBg: "bg-indigo-50/30",
    columnBorder: "border-indigo-200/80 hover:border-indigo-300",
    filterStatuses: ["IN_PROGRESS", "PARTIALLY_COMPLETED"],
    emptyIcon: "play",
    emptyText: "Kéo task vào đây để bắt đầu",
  },
  {
    key: "REVIEWING",
    title: "Đang xem xét",
    badgeTone: "amber",
    dotColor: "bg-amber-500 animate-bounce",
    headerBorder: "border-amber-200",
    columnBg: "bg-amber-50/25",
    columnBorder: "border-amber-200/80 hover:border-amber-300",
    filterStatuses: ["REVIEWING"],
    emptyIcon: "help",
    emptyText: "Kéo task vào đây để chờ kiểm tra cuối ngày",
  },
  {
    key: "COMPLETED",
    title: "Hoàn thành",
    badgeTone: "emerald",
    dotColor: "bg-emerald-600",
    headerBorder: "border-emerald-200",
    columnBg: "bg-emerald-50/25",
    columnBorder: "border-emerald-200/80 hover:border-emerald-300",
    filterStatuses: ["COMPLETED"],
    emptyIcon: "check",
    emptyText: "Kéo task vào đây khi hoàn thành",
  },
];

export function DailyPlanKanbanBoard({
  items,
  editable,
  executable,
  onMoveStatus,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onPomodoro,
  onHistory,
  onOpenSteps,
  onCorrection,
  quizPassed = false,
  quizScore,
  onOpenQuiz,
}: DailyPlanKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [fallbackItem, setFallbackItem] = useState<DailyPlanItem | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string>("TASK_NOT_QUIZ_ELIGIBLE");
  const [fallbackSubmitting, setFallbackSubmitting] = useState(false);

  // Global dragend listener to ensure draggingItemId is reset even if browser drops event
  useEffect(() => {
    function handleGlobalDragEnd() {
      setDraggingItemId(null);
      setDragOverColumn(null);
    }
    window.addEventListener("dragend", handleGlobalDragEnd);
    return () => window.removeEventListener("dragend", handleGlobalDragEnd);
  }, []);

  const reviewingItems = items.filter((item) => item.status === "REVIEWING");

  function handleDragStart(event: React.DragEvent, item: DailyPlanItem) {
    if (!executable) return;
    setDraggingItemId(item.id);
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingItemId(null);
    setDragOverColumn(null);
  }

  function handleDragOver(event: React.DragEvent, colKey: ColumnKey) {
    event.preventDefault();
    if (!executable) return;
    event.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  }

  function handleDragLeave(event: React.DragEvent, colKey: ColumnKey) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  }

  async function handleDrop(event: React.DragEvent, colKey: ColumnKey) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain") || draggingItemId;

    setDraggingItemId(null);
    setDragOverColumn(null);

    if (!itemId || !executable) return;

    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;

    const currentColumnKey: ColumnKey =
      item.status === "COMPLETED"
        ? "COMPLETED"
        : item.status === "REVIEWING"
          ? "REVIEWING"
          : item.status === "IN_PROGRESS" || item.status === "PARTIALLY_COMPLETED"
            ? "IN_PROGRESS"
            : "NOT_STARTED";

    // Dropping in the same lane is a no-op
    if (currentColumnKey === colKey) return;

    // Terminal outcome (COMPLETED, PARTIALLY_COMPLETED, SKIPPED) cannot be moved directly
    if (
      item.status === "COMPLETED" ||
      item.status === "PARTIALLY_COMPLETED" ||
      item.status === "SKIPPED"
    ) {
      if (onCorrection) {
        onCorrection(item);
      } else if (onHistory) {
        onHistory(item);
      }
      return;
    }

    // Strict transition state machine:
    // NOT_STARTED can only move to IN_PROGRESS
    if (item.status === "NOT_STARTED") {
      if (colKey === "IN_PROGRESS") {
        await onMoveStatus(item.id, "IN_PROGRESS");
      }
      return;
    }

    // IN_PROGRESS can move to NOT_STARTED or REVIEWING
    if (item.status === "IN_PROGRESS") {
      if (colKey === "NOT_STARTED") {
        await onMoveStatus(item.id, "NOT_STARTED");
      } else if (colKey === "REVIEWING") {
        await onMoveStatus(item.id, "REVIEWING");
      }
      return;
    }

    // REVIEWING can move to IN_PROGRESS or COMPLETED
    if (item.status === "REVIEWING") {
      if (colKey === "IN_PROGRESS") {
        await onMoveStatus(item.id, "IN_PROGRESS");
        return;
      }
      if (colKey === "COMPLETED") {
        const isUnlocked = Boolean(item.unlockedForCompletion ?? quizPassed);
        if (isUnlocked) {
          await onMoveStatus(item.id, "COMPLETED");
        } else {
          setFallbackItem(item);
        }
      }
    }
  }

  async function handleConfirmManualFallback() {
    if (!fallbackItem) return;
    setFallbackSubmitting(true);
    try {
      await onMoveStatus(
        fallbackItem.id,
        "COMPLETED",
        fallbackItem.plannedMinutes,
        fallbackReason,
      );
      setFallbackItem(null);
    } finally {
      setFallbackSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Board-level Review CTA (USKB-01 AC 4) */}
      {executable && reviewingItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/75 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                Có {reviewingItems.length} nhiệm vụ đang chờ kiểm tra cuối ngày
              </h4>
              <p className="text-xs text-amber-800">
                Làm bài kiểm tra Daily Micro-Quiz để xác nhận kiến thức và mở khóa hoàn thành các nhiệm vụ.
              </p>
            </div>
          </div>
          {onOpenQuiz && (
            <button
              type="button"
              onClick={() => onOpenQuiz()}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-amber-700 transition active:scale-95 shrink-0"
            >
              <Sparkles className="size-4" />
              Bắt đầu kiểm tra cuối ngày
            </button>
          )}
        </div>
      )}

      {/* 4-Column Board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((item) => col.filterStatuses.includes(item.status));
          const totalPlanned = colItems.reduce(
            (acc, curr) => acc + (curr.plannedMinutes ?? 30),
            0,
          );
          const isOver = dragOverColumn === col.key;

          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => void handleDrop(e, col.key)}
              className={`flex flex-col rounded-2xl border transition-all duration-200 ${
                col.columnBorder
              } ${col.columnBg} ${
                isOver ? "ring-2 ring-indigo-500/80 bg-indigo-50/60 scale-[1.008]" : ""
              } min-h-[500px] p-3.5 sm:p-4`}
            >
              {/* Column Header */}
              <div className={`mb-3 flex items-center justify-between border-b ${col.headerBorder} pb-3`}>
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="text-sm font-black tracking-tight text-slate-900">
                    {col.title}
                  </h3>
                  <Badge tone={col.badgeTone} className="text-xs font-bold">
                    {colItems.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3 text-slate-400" />
                    {totalPlanned}p
                  </span>
                  {col.key === "NOT_STARTED" && editable && (
                    <button
                      type="button"
                      onClick={onAddTask}
                      className="focus-ring grid size-6 place-items-center rounded-lg bg-white text-indigo-600 shadow-xs hover:bg-indigo-50"
                      title="Thêm nhiệm vụ mới"
                      aria-label="Thêm nhiệm vụ mới"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task list in column */}
              <div className="flex-1 space-y-3">
                {colItems.length === 0 ? (
                  <div
                    className={`flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 p-4 text-center text-xs text-slate-400 transition ${
                      isOver ? "border-indigo-400 bg-white" : ""
                    }`}
                  >
                    {col.emptyIcon === "circle" ? (
                      <>
                        <Circle className="mb-1 size-5 text-slate-300" />
                        <p className="font-semibold text-slate-500">Trống</p>
                        <p className="text-[11px] text-slate-400">{col.emptyText}</p>
                      </>
                    ) : col.emptyIcon === "play" ? (
                      <>
                        <Play className="mb-1 size-5 text-slate-300 fill-slate-200" />
                        <p className="font-semibold text-slate-500">Trống</p>
                        <p className="text-[11px] text-slate-400">{col.emptyText}</p>
                      </>
                    ) : col.emptyIcon === "help" ? (
                      <>
                        <HelpCircle className="mb-1 size-5 text-amber-400" />
                        <p className="font-semibold text-amber-700">Trống</p>
                        <p className="text-[11px] text-slate-400">{col.emptyText}</p>
                      </>
                    ) : (
                      <>
                        <Check className="mb-1 size-5 text-emerald-400" />
                        <p className="font-semibold text-slate-500">Trống</p>
                        <p className="text-[11px] text-slate-400">{col.emptyText}</p>
                      </>
                    )}
                  </div>
                ) : (
                  colItems.map((item) => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      currentColumn={col.key}
                      editable={editable}
                      executable={executable}
                      isDragging={draggingItemId === item.id}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onMoveStatus={onMoveStatus}
                      onEdit={() => onEditTask(item)}
                      onDelete={() => onDeleteTask(item)}
                      onPomodoro={onPomodoro ? () => onPomodoro(item) : undefined}
                      onHistory={onHistory ? () => onHistory(item) : undefined}
                      onCorrection={onCorrection ? () => onCorrection(item) : undefined}
                      onOpenSteps={onOpenSteps ? () => onOpenSteps(item) : undefined}
                      onManualFallback={() => setFallbackItem(item)}
                      quizPassed={quizPassed}
                      quizScore={quizScore}
                      onOpenQuiz={onOpenQuiz}
                    />
                  ))
                )}
              </div>

              {/* Bottom quick add button for Not Started column */}
              {col.key === "NOT_STARTED" && editable && (
                <button
                  type="button"
                  onClick={onAddTask}
                  className="focus-ring mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white/60 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-400 hover:bg-white hover:text-indigo-600"
                >
                  <Plus className="size-3.5" />
                  Thêm task mới
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Fallback Modal (USKB-01 AC 7) */}
      {fallbackItem && (
        <Modal
          open={Boolean(fallbackItem)}
          onClose={() => setFallbackItem(null)}
          title="Hoàn thành nhiệm vụ thủ công"
          description={`Xác nhận hoàn thành "${fallbackItem.title}" mà không cần kết quả Daily Micro-Quiz.`}
          closeDisabled={fallbackSubmitting}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Vui lòng chọn lý do hoàn thành thủ công. Hành động này sẽ được ghi vào lịch sử tiến độ
              và audit trail:
            </p>

            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                <input
                  type="radio"
                  name="manual-fallback-reason"
                  className="mt-0.5 text-indigo-600"
                  checked={fallbackReason === "TASK_NOT_QUIZ_ELIGIBLE"}
                  onChange={() => setFallbackReason("TASK_NOT_QUIZ_ELIGIBLE")}
                />
                <div>
                  <span className="block font-bold text-slate-800">
                    Nhiệm vụ không đủ điều kiện tạo Quiz
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Nhiệm vụ tùy chỉnh hoặc không liên kết bài học lộ trình.
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                <input
                  type="radio"
                  name="manual-fallback-reason"
                  className="mt-0.5 text-indigo-600"
                  checked={fallbackReason === "AI_UNAVAILABLE"}
                  onChange={() => setFallbackReason("AI_UNAVAILABLE")}
                />
                <div>
                  <span className="block font-bold text-slate-800">
                    AI không khả dụng hoặc lỗi sinh đề
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Dùng khi nhà cung cấp AI gặp sự cố, timeout hoặc hết hạn ngạch.
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                <input
                  type="radio"
                  name="manual-fallback-reason"
                  className="mt-0.5 text-indigo-600"
                  checked={fallbackReason === "USER_MANUAL_OVERRIDE"}
                  onChange={() => setFallbackReason("USER_MANUAL_OVERRIDE")}
                />
                <div>
                  <span className="block font-bold text-slate-800">
                    Tự xác nhận hoàn thành
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bạn tự tin đã nắm vững kiến thức và xác nhận hoàn thành trực tiếp.
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                disabled={fallbackSubmitting}
                onClick={() => setFallbackItem(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={fallbackSubmitting}
                onClick={() => void handleConfirmManualFallback()}
              >
                Xác nhận hoàn thành
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface KanbanCardProps {
  item: DailyPlanItem;
  currentColumn: ColumnKey;
  editable: boolean;
  executable: boolean;
  isDragging: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveStatus: (
    itemId: string,
    newStatus: DailyTaskStatus,
    actualMinutes?: number,
    manualFallbackReason?: string,
  ) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  onPomodoro?: () => void;
  onHistory?: () => void;
  onCorrection?: () => void;
  onOpenSteps?: () => void;
  onManualFallback: () => void;
  quizPassed?: boolean;
  quizScore?: number | null;
  onOpenQuiz?: (item?: DailyPlanItem) => void;
}

function KanbanCard({
  item,
  currentColumn,
  editable,
  executable,
  isDragging,
  onDragStart,
  onDragEnd,
  onMoveStatus,
  onEdit,
  onDelete,
  onPomodoro,
  onHistory,
  onCorrection,
  onOpenSteps,
  onManualFallback,
  quizPassed = false,
  quizScore,
  onOpenQuiz,
}: KanbanCardProps) {
  const [moving, setMoving] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const adjustment = item.aiAdjustmentAction ? getAdjustmentDisplay(item.aiAdjustmentAction) : null;
  const steps = item.steps ?? [];
  const isUnlocked = Boolean(item.unlockedForCompletion ?? quizPassed);

  async function handleStatusChange(nextStatus: DailyTaskStatus) {
    if (moving || !executable) return;

    // Check quiz gate before moving to COMPLETED
    if (nextStatus === "COMPLETED" && !isUnlocked) {
      onManualFallback();
      return;
    }

    setMoving(true);
    try {
      await onMoveStatus(item.id, nextStatus);
    } finally {
      setMoving(false);
    }
  }

  return (
    <Card
      draggable={executable && !moving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab select-none p-3.5 transition-all duration-200 active:cursor-grabbing hover:shadow-md ${
        isDragging ? "ring-2 ring-indigo-400 shadow-md scale-[0.98]" : ""
      } ${
        moving ? "opacity-60 pointer-events-none" : ""
      } ${
        item.status === "COMPLETED"
          ? "border-emerald-200 bg-emerald-50/30"
          : item.status === "REVIEWING"
            ? "border-amber-200 bg-amber-50/20"
            : item.status === "IN_PROGRESS"
              ? "border-indigo-200 bg-white"
              : "border-slate-200 bg-white"
      }`}
    >
      {/* Top Header of Card: Category tag + Planned Minutes + Quick tools */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {executable && (
            <span
              className="text-slate-300 group-hover:text-slate-500 cursor-grab"
              title="Kéo để đổi trạng thái"
            >
              <GripVertical className="size-3.5" />
            </span>
          )}
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
            {dailyTaskCategoryLabels[item.category]}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Clock3 className="size-3 text-slate-400" />
            {item.plannedMinutes ?? 30}p
          </span>
          {adjustment && (
            <Badge tone={adjustment.tone} className="text-[10px]">
              <Sparkles className="mr-0.5 inline-block size-2.5" />
              {adjustment.label}
            </Badge>
          )}

          {/* Outcome Badges (USKB-01 AC 11) */}
          {item.status === "PARTIALLY_COMPLETED" && (
            <Badge tone="amber" className="text-[10px]">
              Hoàn thành 50%
            </Badge>
          )}
          {item.status === "SKIPPED" && (
            <Badge tone="slate" className="text-[10px]">
              Bỏ qua
            </Badge>
          )}
        </div>

        {/* Tool actions */}
        <div className="flex items-center gap-0.5">
          {executable && onPomodoro && item.status !== "COMPLETED" && (
            <button
              type="button"
              onClick={onPomodoro}
              className="focus-ring rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Khởi động Pomodoro"
              aria-label={`Bật Pomodoro cho ${item.title}`}
            >
              <Timer className="size-3.5" />
            </button>
          )}

          {item.status !== "NOT_STARTED" && onHistory && (
            <button
              type="button"
              onClick={onHistory}
              className="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
              title="Lịch sử tiến độ"
              aria-label={`Lịch sử ${item.title}`}
            >
              <History className="size-3.5" />
            </button>
          )}

          {editable && item.status === "NOT_STARTED" && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="focus-ring rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                title="Chỉnh sửa"
                aria-label={`Chỉnh sửa ${item.title}`}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="focus-ring rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Xóa"
                aria-label={`Xóa ${item.title}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task title */}
      <h4
        className={`mt-2 text-sm font-extrabold leading-snug ${
          item.status === "COMPLETED" ? "text-slate-500 line-through" : "text-slate-900"
        }`}
      >
        {item.title}
      </h4>

      {/* Description */}
      {item.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {item.description}
        </p>
      )}

      {/* Linked Learning Unit */}
      {(item.studyUnit || item.learningUnitId) && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800">
          <span>📚</span>
          <span className="truncate max-w-[230px]">
            {item.studyUnit?.title ?? item.learningUnitTitle ?? item.roadmapItemTitle}
          </span>
        </div>
      )}

      {/* AI reason if any */}
      {adjustment && item.aiAdjustmentReason && (
        <div className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 size-3 shrink-0 text-indigo-500" />
          <span>{item.aiAdjustmentReason}</span>
        </div>
      )}

      {/* Guidance Steps Accordion (USKB-01 AC 12) */}
      {steps.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-left">
          <button
            type="button"
            onClick={() => setShowHints((prev) => !prev)}
            className="flex w-full items-center justify-between text-[11px] font-bold text-slate-600 hover:text-indigo-600"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb className="size-3 text-amber-500" />
              Gợi ý thực hiện ({steps.length} bước)
            </span>
            <ChevronDown
              className={`size-3 text-slate-400 transition-transform ${
                showHints ? "rotate-180" : ""
              }`}
            />
          </button>

          {showHints && (
            <ul className="mt-2 space-y-1.5 border-t border-slate-200/60 pt-2 text-[11px] text-slate-600">
              {steps.map((step, idx) => (
                <li key={step.id || idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <span className="font-semibold text-slate-800">{step.title}</span>
                    {step.guidance && (
                      <p className="mt-0.5 text-[10px] text-slate-500">{step.guidance}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Review Status Banner inside REVIEWING card */}
      {currentColumn === "REVIEWING" && (
        <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-left">
          {isUnlocked ? (
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <Check className="size-4 shrink-0 text-emerald-600" />
              <span>Đã mở khóa (vượt qua bài Quiz). Có thể hoàn thành!</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <HelpCircle className="size-4 shrink-0 text-amber-600" />
                <span>Đang chờ kiểm tra cuối ngày</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Làm bài quiz cuối ngày để xác nhận kiến thức, hoặc chọn hoàn thành thủ công nếu không có đề.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Move Actions */}
      {executable && (
        <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100/80 pt-2.5">
          {currentColumn === "NOT_STARTED" && (
            <button
              type="button"
              disabled={moving}
              onClick={() => void handleStatusChange("IN_PROGRESS")}
              className="focus-ring flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
              title="Bắt đầu thực hiện nhiệm vụ"
            >
              <Play className="size-2.5 fill-current" />
              Bắt đầu
            </button>
          )}

          {currentColumn === "IN_PROGRESS" && (
            <>
              <button
                type="button"
                disabled={moving}
                onClick={() => void handleStatusChange("NOT_STARTED")}
                className="focus-ring flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200"
                title="Quay lại Chưa hoàn thành"
              >
                <ArrowLeft className="size-2.5" />
                Quay lại
              </button>
              <button
                type="button"
                disabled={moving}
                onClick={() => void handleStatusChange("REVIEWING")}
                className="focus-ring flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-amber-600"
                title="Chuyển sang Đang xem xét để chờ kiểm tra"
              >
                <HelpCircle className="size-3" />
                Gửi kiểm tra
              </button>
            </>
          )}

          {currentColumn === "REVIEWING" && (
            <>
              <button
                type="button"
                disabled={moving}
                onClick={() => void handleStatusChange("IN_PROGRESS")}
                className="focus-ring flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200"
                title="Quay lại làm tiếp"
              >
                <ArrowLeft className="size-2.5" />
                Làm tiếp
              </button>

              {isUnlocked ? (
                <button
                  type="button"
                  disabled={moving}
                  onClick={() => void handleStatusChange("COMPLETED")}
                  className="focus-ring flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700"
                  title="Đánh dấu Hoàn thành"
                >
                  <Check className="size-3" />
                  Hoàn thành
                </button>
              ) : (
                <button
                  type="button"
                  disabled={moving}
                  onClick={onManualFallback}
                  className="focus-ring flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
                  title="Hoàn thành thủ công không qua quiz"
                >
                  Hoàn thành thủ công
                </button>
              )}
            </>
          )}

          {currentColumn === "COMPLETED" && (
            <button
              type="button"
              disabled={moving}
              onClick={() => {
                if (onCorrection) {
                  onCorrection();
                } else if (onHistory) {
                  onHistory();
                }
              }}
              className="focus-ring flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
              title="Sửa kết quả qua quy trình Correction"
            >
              <RotateCcw className="size-2.5" />
              Sửa tiến độ / Mở lại
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
