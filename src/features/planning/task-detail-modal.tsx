"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2,
  PenTool,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import type { ChecklistItem, PlanTask, TaskDocument } from "@/types/planning";

/* ─── Status / Priority Mappings ───────────────────────────── */

const statusConfig: Record<
  PlanTask["status"],
  { label: string; tone: "slate" | "indigo" | "emerald" | "amber" }
> = {
  NOT_STARTED: { label: "Chưa bắt đầu", tone: "slate" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "indigo" },
  COMPLETED: { label: "Hoàn thành", tone: "emerald" },
  ON_HOLD: { label: "Tạm dừng", tone: "amber" },
};

const priorityConfig: Record<
  PlanTask["priority"],
  { label: string; tone: "slate" | "indigo" | "emerald" | "amber" | "rose" }
> = {
  LOW: { label: "Thấp", tone: "slate" },
  MEDIUM: { label: "Trung bình", tone: "indigo" },
  HIGH: { label: "Cao", tone: "amber" },
  URGENT: { label: "Khẩn cấp", tone: "rose" },
};

const fileTypeIcon: Record<TaskDocument["fileType"], { icon: typeof FileText; color: string }> = {
  PDF: { icon: FileText, color: "text-rose-600 bg-rose-50" },
  DOCX: { icon: FileText, color: "text-blue-600 bg-blue-50" },
  IMAGE: { icon: FileImage, color: "text-violet-600 bg-violet-50" },
  FIGMA: { icon: PenTool, color: "text-pink-600 bg-pink-50" },
  LINK: { icon: Link2, color: "text-cyan-600 bg-cyan-50" },
  SPREADSHEET: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
};

/* ─── Component ────────────────────────────────────────────── */

export function TaskDetailModal({
  open,
  onClose,
  task,
}: {
  open: boolean;
  onClose: () => void;
  task: PlanTask;
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist);

  function toggleItem(id: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: !item.isCompleted } : item)),
    );
  }

  const completedCount = checklist.filter((item) => item.isCompleted).length;
  const checklistProgress = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];

  return (
    <Modal open={open} onClose={onClose} title={task.title} width="max-w-2xl">
      <div className="space-y-7">
        {/* ── Badges Row ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={priority.tone}>
            <Sparkles className="mr-1 size-3" />
            {priority.label}
          </Badge>
          <Badge>{task.category}</Badge>
        </div>

        {/* ── Metadata ── */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
          <MetaField icon={User} label="Phụ trách" value={task.assignee} />
          <MetaField icon={Calendar} label="Hạn chót" value={formatDueDate(task.dueDate)} />
          <MetaField icon={Clock3} label="Dự kiến" value={`${task.estimatedMinutes} phút`} />
        </div>

        {/* ── Description ── */}
        <section>
          <h3 className="mb-2 text-sm font-extrabold text-slate-900">Mô tả</h3>
          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            {task.description}
          </p>
        </section>

        {/* ── Checklist ── */}
        {checklist.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Danh sách kiểm tra
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {completedCount}/{checklist.length} hoàn thành
              </span>
            </div>
            <div className="mb-3">
              <ProgressBar value={checklistProgress} />
            </div>
            <div className="space-y-1">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                    item.isCompleted
                      ? "bg-emerald-50/60 hover:bg-emerald-50"
                      : "hover:bg-slate-50",
                  )}
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600 transition-transform group-hover:scale-110" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-400" />
                  )}
                  <span
                    className={cn(
                      "text-sm transition-all",
                      item.isCompleted
                        ? "text-slate-500 line-through"
                        : "font-medium text-slate-800",
                    )}
                  >
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Documents ── */}
        {task.documents.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-extrabold text-slate-900">Tài liệu</h3>
            <div className="space-y-2">
              {task.documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

/* ─── Sub-components ───────────────────────────────────────── */

function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold text-slate-400">{label}</span>
        <span className="block truncate text-sm font-bold text-slate-800">{value}</span>
      </div>
    </div>
  );
}

function DocumentRow({ doc }: { doc: TaskDocument }) {
  const config = fileTypeIcon[doc.fileType];
  const Icon = config.icon;
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", config.color)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700">
          {doc.fileName}
        </span>
        <span className="block text-[11px] font-semibold text-slate-400">{doc.fileType}</span>
      </div>
      <ExternalLink className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" />
    </a>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}
