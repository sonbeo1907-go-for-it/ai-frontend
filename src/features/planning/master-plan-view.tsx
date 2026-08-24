"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  Loader2,
  Target,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import type { MasterPlanMilestone, PlanTask } from "@/types/planning";
import { mockMasterPlanMilestones } from "./mock-data";
import { TaskDetailModal } from "./task-detail-modal";

const milestoneStatusConfig: Record<
  MasterPlanMilestone["status"],
  { label: string; tone: "slate" | "indigo" | "emerald"; color: string }
> = {
  NOT_STARTED: { label: "Chưa bắt đầu", tone: "slate", color: "from-slate-400 to-slate-500" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "indigo", color: "from-indigo-500 to-blue-600" },
  COMPLETED: { label: "Hoàn thành", tone: "emerald", color: "from-emerald-500 to-teal-600" },
};

const taskStatusIcon: Record<PlanTask["status"], { icon: typeof Circle; className: string }> = {
  NOT_STARTED: { icon: Circle, className: "text-slate-300" },
  IN_PROGRESS: { icon: Loader2, className: "text-indigo-500 animate-spin" },
  COMPLETED: { icon: CheckCircle2, className: "text-emerald-600" },
  ON_HOLD: { icon: Clock3, className: "text-amber-500" },
};

export function MasterPlanView() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(mockMasterPlanMilestones.filter((ms) => ms.status !== "COMPLETED").map((ms) => ms.id)),
  );
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalTasks = mockMasterPlanMilestones.reduce((sum, ms) => sum + ms.tasks.length, 0);
  const completedTasks = mockMasterPlanMilestones.reduce(
    (sum, ms) => sum + ms.tasks.filter((t) => t.status === "COMPLETED").length,
    0,
  );
  const overallProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Summary Card ── */}
      <Card className="relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-indigo-50/70" />
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-violet-50/50" />
        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Target className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight">Roadmap tổng thể</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                  Theo dõi tiến độ từng giai đoạn và quản lý tất cả nhiệm vụ trong dự án AI Planning.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-2xl bg-slate-50 px-5 py-3 text-center">
              <div>
                <span className="block text-2xl font-black text-indigo-700">{overallProgress}%</span>
                <span className="block text-[11px] font-semibold text-slate-500">Tổng tiến độ</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="block text-2xl font-black text-slate-900">{completedTasks}/{totalTasks}</span>
                <span className="block text-[11px] font-semibold text-slate-500">Nhiệm vụ</span>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar value={overallProgress} />
          </div>
        </div>
      </Card>

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent sm:block" />

        <div className="space-y-5">
          {mockMasterPlanMilestones.map((milestone, index) => {
            const config = milestoneStatusConfig[milestone.status];
            const expanded = expandedIds.has(milestone.id);
            const completedInMs = milestone.tasks.filter((t) => t.status === "COMPLETED").length;

            return (
              <div key={milestone.id} className="relative sm:pl-16">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-4 top-7 hidden size-5 rounded-full border-[3px] border-white shadow-sm sm:block",
                    `bg-gradient-to-br ${config.color}`,
                  )}
                />

                <Card
                  className={cn(
                    "overflow-hidden transition-all",
                    expanded && "ring-1 ring-slate-200",
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Milestone header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(milestone.id)}
                    className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50/50 sm:p-6"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg transition-transform",
                        expanded ? "rotate-0" : "-rotate-90",
                      )}
                    >
                      <ChevronDown className="size-5 text-slate-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">{milestone.title}</h3>
                        <Badge tone={config.tone}>{config.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{milestone.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Flag className="size-3" />
                          {completedInMs}/{milestone.tasks.length} nhiệm vụ
                        </span>
                        <span className="flex items-center gap-1">
                          Tiến độ: {milestone.progress}%
                        </span>
                      </div>
                      <div className="mt-2 max-w-md">
                        <ProgressBar value={milestone.progress} />
                      </div>
                    </div>
                  </button>

                  {/* Tasks list */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30">
                      {milestone.tasks.map((task) => {
                        const iconConfig = taskStatusIcon[task.status];
                        const TaskIcon = iconConfig.icon;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className="flex w-full items-center gap-3 border-b border-slate-100 px-6 py-4 text-left transition-all last:border-0 hover:bg-white"
                          >
                            <TaskIcon className={cn("size-5 shrink-0", iconConfig.className)} />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-800">
                                {task.title}
                              </span>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="size-3" />
                                  {task.assignee}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock3 className="size-3" />
                                  {task.estimatedMinutes} phút
                                </span>
                                {task.checklist.length > 0 && (
                                  <span>
                                    {task.checklist.filter((c) => c.isCompleted).length}/{task.checklist.length} checklist
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="size-4 shrink-0 text-slate-300" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
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
