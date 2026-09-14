import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { progressOutcomeLabels, roadmapProgressStatusLabels } from "@/lib/display-labels";
import type { RoadmapItem, RoadmapItemProgress, RoadmapProgressSummary } from "@/types/api";

export function RoadmapProgressSummaryCard({
  progress,
}: {
  progress?: RoadmapProgressSummary | null;
}) {
  if (!progress) return null;

  return (
    <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
            Tiến độ phiên bản đang hoạt động
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {progress.completedTopics}/{progress.totalTopics} chủ đề đã hoàn thành
          </p>
        </div>
        <strong className="text-2xl font-black text-indigo-700">
          {formatPercentage(progress.completionPercentage)}
        </strong>
      </div>
      <ProgressBar value={progress.completionPercentage} className="mt-3" />
    </div>
  );
}

export function TopicProgress({ progress }: { progress?: RoadmapItemProgress | null }) {
  if (!progress) return null;

  return (
    <div className="mt-3 rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <Badge tone={progressTone(progress)}>
          {roadmapProgressStatusLabels[progress.completionState]}
        </Badge>
        <span className="font-bold text-slate-500">
          {progress.completedLearningUnits ?? 0}/{progress.totalLearningUnits ?? 0} đơn vị học
        </span>
      </div>
      <ProgressBar value={progress.completionPercentage} className="mt-2" />
    </div>
  );
}

export function LearningUnitProgress({ item }: { item: RoadmapItem }) {
  const progress = item.progress;
  const completed = progress?.completionState === "COMPLETED";

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
          completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-800">{item.title}</p>
          {progress && (
            <Badge tone={progressTone(progress)}>
              {roadmapProgressStatusLabels[progress.completionState]}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {item.estimatedMinutes ?? 0} phút
          </span>
          {progress?.latestOutcome && (
            <span>Kết quả gần nhất: {progressOutcomeLabels[progress.latestOutcome]}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
      aria-label={`Tiến độ ${formatPercentage(normalized)}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-[width]"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

function progressTone(progress: RoadmapItemProgress) {
  if (progress.completionState === "COMPLETED") return "emerald" as const;
  if (progress.latestOutcome === "SKIPPED") return "rose" as const;
  if (progress.completionState === "IN_PROGRESS") return "amber" as const;
  return "slate" as const;
}

function formatPercentage(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}
