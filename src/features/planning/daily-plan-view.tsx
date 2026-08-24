"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Loader2,
  Pause,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import type { DailyPlanEntry, PlanTask } from "@/types/planning";
import { mockDailyPlanEntries } from "./mock-data";
import { TaskDetailModal } from "./task-detail-modal";

const statusColumns: { key: PlanTask["status"]; label: string; accent: string }[] = [
  { key: "NOT_STARTED", label: "Chưa bắt đầu", accent: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "Đang thực hiện", accent: "bg-indigo-500" },
  { key: "COMPLETED", label: "Hoàn thành", accent: "bg-emerald-500" },
];

const taskStatusIcon: Record<PlanTask["status"], { icon: typeof Circle; className: string }> = {
  NOT_STARTED: { icon: Circle, className: "text-slate-300" },
  IN_PROGRESS: { icon: Loader2, className: "text-indigo-500 animate-spin" },
  COMPLETED: { icon: CheckCircle2, className: "text-emerald-600" },
  ON_HOLD: { icon: Pause, className: "text-amber-500" },
};

export function DailyPlanView() {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);

  const entry: DailyPlanEntry = mockDailyPlanEntries[selectedDateIndex];

  const grouped = useMemo(() => {
    const result: Record<PlanTask["status"], PlanTask[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      ON_HOLD: [],
    };
    for (const task of entry.tasks) {
      result[task.status].push(task);
    }
    return result;
  }, [entry]);

  const completedCount = entry.tasks.filter((t) => t.status === "COMPLETED").length;
  const completionPct = entry.tasks.length
    ? Math.round((completedCount / entry.tasks.length) * 100)
    : 0;

  function navigateDay(direction: -1 | 1) {
    setSelectedDateIndex((prev) =>
      Math.max(0, Math.min(mockDailyPlanEntries.length - 1, prev + direction)),
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Date Navigator ── */}
      <Card className="p-1.5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateDay(-1)}
            disabled={selectedDateIndex === 0}
            className="focus-ring rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            {mockDailyPlanEntries.map((e, i) => {
              const isSelected = i === selectedDateIndex;
              const isToday = e.date === todayIso();
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedDateIndex(i)}
                  className={cn(
                    "focus-ring relative flex flex-col items-center rounded-xl px-4 py-2.5 transition-all",
                    isSelected
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                  )}
                >
                  <span className="text-[10px] font-bold uppercase">
                    {formatWeekday(e.date)}
                  </span>
                  <span className="mt-0.5 text-lg font-black">{e.date.slice(-2)}</span>
                  {isToday && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 size-1.5 rounded-full",
                        isSelected ? "bg-white" : "bg-indigo-500",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigateDay(1)}
            disabled={selectedDateIndex === mockDailyPlanEntries.length - 1}
            className="focus-ring rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </Card>

      {/* ── Day Summary ── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {formatFullDate(entry.date)}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {entry.totalPlannedMinutes}/{entry.availableMinutes} phút đã lên lịch
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-2xl bg-slate-50 px-5 py-3 text-center text-xs">
              <div>
                <span className="block text-lg font-black text-slate-900">{entry.tasks.length}</span>
                <span className="font-semibold text-slate-400">Nhiệm vụ</span>
              </div>
              <div>
                <span className="block text-lg font-black text-indigo-700">{completionPct}%</span>
                <span className="font-semibold text-slate-400">Tiến độ</span>
              </div>
              <div>
                <span className="block text-lg font-black text-emerald-700">{completedCount}</span>
                <span className="font-semibold text-slate-400">Xong</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={completionPct} />
          </div>
        </div>
      </Card>

      {/* ── Kanban Columns ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {statusColumns.map(({ key, label, accent }) => {
          const tasks = grouped[key];
          return (
            <div key={key}>
              <div className="mb-3 flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", accent)} />
                <h4 className="text-sm font-extrabold text-slate-700">{label}</h4>
                <span className="ml-auto rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">
                    Không có nhiệm vụ
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Detail Modal ── */}
      {selectedTask && (
        <TaskDetailModal
          open
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
        />
      )}
    </div>
  );
}

/* ─── TaskCard ─────────────────────────────────────────────── */

function TaskCard({ task, onClick }: { task: PlanTask; onClick: () => void }) {
  const iconConfig = taskStatusIcon[task.status];
  const TaskIcon = iconConfig.icon;
  const checkDone = task.checklist.filter((c) => c.isCompleted).length;
  const checkTotal = task.checklist.length;

  const priorityColors: Record<PlanTask["priority"], string> = {
    LOW: "border-l-slate-300",
    MEDIUM: "border-l-indigo-400",
    HIGH: "border-l-amber-400",
    URGENT: "border-l-rose-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border border-slate-200 border-l-[3px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg",
        priorityColors[task.priority],
      )}
    >
      <div className="flex items-start gap-3">
        <TaskIcon className={cn("mt-0.5 size-5 shrink-0", iconConfig.className)} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700">
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {task.assignee.split(" ").slice(-2).join(" ")}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" />
              {task.estimatedMinutes}p
            </span>
            {checkTotal > 0 && (
              <Badge tone={checkDone === checkTotal ? "emerald" : "slate"}>
                {checkDone}/{checkTotal}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatWeekday(isoDate: string) {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
    new Date(`${isoDate}T00:00:00`),
  );
}

function formatFullDate(isoDate: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00`));
}
