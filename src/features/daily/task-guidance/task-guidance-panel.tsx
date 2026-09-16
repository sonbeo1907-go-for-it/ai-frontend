"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import type { DailyPlanTaskStep, TaskGuidanceRevision } from "@/types/api";
import { TaskGuidanceExecutionStatus } from "./task-guidance-execution-status";
import { TaskGuidanceReferenceList } from "./task-guidance-reference-list";
import { TaskStepGuidanceCard } from "./task-step-guidance-card";
import { useTaskGuidance } from "./use-task-guidance";

const MAX_ADJUSTMENT_LENGTH = 1_000;

export function TaskGuidancePanel({
  planId,
  versionId,
  itemId,
  steps,
  onDirtyChange,
}: {
  planId: string;
  versionId: string;
  itemId: string;
  steps: DailyPlanTaskStep[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  const contextKey = useMemo(
    () => steps.map((step) => `${step.id}:${step.entityVersion}:${step.orderIndex}`).join("|"),
    [steps],
  );
  const guidance = useTaskGuidance({ planId, versionId, itemId, contextKey });
  const revision = guidance.selectedRevision;
  const history = guidance.overview?.revisions;
  const busy = guidance.active || guidance.submitting || guidance.recovering;

  useEffect(() => {
    onDirtyChange(adjusting && adjustment.trim().length > 0);
    return () => onDirtyChange(false);
  }, [adjusting, adjustment, onDirtyChange]);

  async function submitRegeneration() {
    const accepted = await guidance.regenerate(adjustment);
    if (!accepted) return;
    setAdjusting(false);
    setAdjustment("");
  }

  function closeAdjustment() {
    setAdjusting(false);
    setAdjustment("");
  }

  return (
    <section className="space-y-4 border-t border-slate-200 pt-5" aria-label="Hướng dẫn AI">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-600" aria-hidden="true" />
            <h2 className="font-black text-slate-950">Hướng dẫn thực hiện bằng AI</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Nội dung tư vấn giúp bạn thực hiện checklist; không tự đánh dấu hoàn thành.
          </p>
        </div>

        {revision && !adjusting && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAdjusting(true)}
            disabled={busy}
          >
            <RefreshCw className="size-4" />
            Tạo lại
          </Button>
        )}
      </div>

      <TaskGuidanceExecutionStatus
        execution={guidance.execution}
        recovering={guidance.recovering}
        pollingError={guidance.pollingError}
        onRefresh={guidance.refresh}
        onDismiss={guidance.dismissFailure}
      />

      {guidance.error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">{guidance.error}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={guidance.refresh}
          >
            <RefreshCw className="size-4" />
            Tải lại trạng thái
          </Button>
        </div>
      )}

      {adjusting && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <h3 className="font-extrabold text-slate-900">Tạo phiên bản hướng dẫn mới</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Phiên bản hiện tại vẫn được giữ trong lịch sử. Yêu cầu điều chỉnh là tùy chọn.
          </p>
          <div className="mt-4">
            <Field
              label="Điều chỉnh mong muốn"
              hint={`${adjustment.length}/${MAX_ADJUSTMENT_LENGTH} ký tự`}
            >
              <Textarea
                value={adjustment}
                onChange={(event) => setAdjustment(event.target.value)}
                maxLength={MAX_ADJUSTMENT_LENGTH}
                rows={4}
                placeholder="Ví dụ: Dùng ví dụ Java ngắn hơn và nhấn mạnh lỗi thường gặp."
                data-modal-initial-focus
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeAdjustment}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              loading={guidance.submitting}
              onClick={() => void submitRegeneration()}
            >
              <Sparkles className="size-4" />
              Tạo phiên bản mới
            </Button>
          </div>
        </div>
      )}

      {guidance.loading || guidance.loadingRevision ? (
        <GuidanceSkeleton />
      ) : !revision ? (
        !guidance.active && (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 px-6 py-8 text-center">
            <Sparkles className="mx-auto size-9 text-indigo-400" />
            <h3 className="mt-3 font-extrabold text-slate-900">Chưa có hướng dẫn AI</h3>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
              AI sẽ giải thích cách thực hiện các bước hiện có. Checklist và tiến độ của bạn không
              bị thay đổi.
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => void guidance.generate()}
              loading={guidance.submitting}
              disabled={busy}
            >
              <Sparkles className="size-4" />
              Tạo hướng dẫn bằng AI
            </Button>
          </div>
        )
      ) : (
        <GuidanceRevisionContent revision={revision} steps={steps} />
      )}

      {history && history.totalElements > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="size-4 text-slate-500" />
              <h3 className="text-sm font-extrabold text-slate-900">Lịch sử hướng dẫn</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {history.totalElements} phiên bản
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {history.content.map((summary) => (
              <button
                type="button"
                key={summary.revisionId}
                onClick={() => void guidance.selectRevision(summary.revisionId)}
                disabled={guidance.loadingRevision}
                aria-current={revision?.revisionId === summary.revisionId ? "true" : undefined}
                className={`focus-ring rounded-xl border px-3 py-2 text-left text-xs transition ${
                  revision?.revisionId === summary.revisionId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                }`}
              >
                <span className="font-extrabold">Phiên bản {summary.revisionNumber}</span>
                <span className="ml-2">{summary.latest ? "Mới nhất" : "Đã thay thế"}</span>
                {summary.stale && <span className="ml-2 text-amber-700">Đã cũ</span>}
              </button>
            ))}
          </div>

          {history.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={history.first}
                onClick={() => void guidance.loadHistoryPage(history.page - 1)}
              >
                <ChevronLeft className="size-4" />
                Trang trước
              </Button>
              <span className="text-xs font-bold text-slate-500">
                Trang {history.page + 1}/{history.totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={history.last}
                onClick={() => void guidance.loadHistoryPage(history.page + 1)}
              >
                Trang sau
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function GuidanceRevisionContent({
  revision,
  steps,
}: {
  revision: TaskGuidanceRevision;
  steps: DailyPlanTaskStep[];
}) {
  const stepsById = new Map(steps.map((step) => [step.id, step]));

  return (
    <article className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={revision.latest ? "indigo" : "slate"}>
          Phiên bản {revision.revisionNumber}
        </Badge>
        <Badge tone={revision.status === "DRAFT" ? "indigo" : "slate"}>
          {revision.status === "DRAFT" ? "Bản nháp" : "Đã thay thế"}
        </Badge>
        {revision.stale && <Badge tone="amber">Hướng dẫn đã cũ</Badge>}
        <span className="text-xs text-slate-400">
          {formatDate(revision.generatedAt, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {revision.stale && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Checklist đã thay đổi sau khi hướng dẫn này được tạo. Nội dung lịch sử không được gắn
            lại vào các bước hiện tại; hãy tạo lại để nhận hướng dẫn phù hợp.
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Mục tiêu</p>
        <h3 className="mt-1 font-black text-slate-950">{revision.objective}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {revision.taskSummary}
        </p>
      </div>

      <TaskGuidanceReferenceList references={revision.references} />

      {revision.stepGuidances.length > 0 && (
        <div className="space-y-3">
          {revision.stepGuidances
            .slice()
            .sort((left, right) => left.orderIndex - right.orderIndex)
            .map((stepGuidance) => (
              <TaskStepGuidanceCard
                key={stepGuidance.id}
                guidance={stepGuidance}
                stepTitle={
                  revision.stale ? undefined : stepsById.get(stepGuidance.taskStepId)?.title
                }
                historical={revision.stale}
              />
            ))}
        </div>
      )}
    </article>
  );
}

function GuidanceSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
      <LoaderCircle className="size-5 animate-spin text-indigo-600" />
      Đang tải hướng dẫn…
    </div>
  );
}
