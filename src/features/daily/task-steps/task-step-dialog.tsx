"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/states";
import { dailyTaskCategoryLabels } from "@/lib/display-labels";
import type { DailyPlanItem, DailyPlanTaskStep, DailyPlanTaskStepsResponse } from "@/types/api";
import { TaskStepForm } from "./task-step-form";
import { useTaskSteps } from "./use-task-steps";
import { TaskGuidancePanel } from "../task-guidance/task-guidance-panel";

interface TaskStepDialogProps {
  open: boolean;
  planId: string;
  versionId: string;
  item: DailyPlanItem;
  editable: boolean;
  executable: boolean;
  onClose: () => void;
  onStepsChanged: (response: DailyPlanTaskStepsResponse) => void;
  onRecordOutcome: (item: DailyPlanItem) => void;
}

function isFinalOutcome(item: DailyPlanItem) {
  return ["COMPLETED", "PARTIALLY_COMPLETED", "SKIPPED"].includes(item.status);
}

export function TaskStepDialog({
  open,
  planId,
  versionId,
  item,
  editable,
  executable,
  onClose,
  onStepsChanged,
  onRecordOutcome,
}: TaskStepDialogProps) {
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingStep, setEditingStep] = useState<DailyPlanTaskStep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyPlanTaskStep | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [guidanceDirty, setGuidanceDirty] = useState(false);
  const { data, pendingKey, refreshing, create, update, remove, setCompletion, refresh } =
    useTaskSteps({
      planId,
      versionId,
      item,
      onChange: onStepsChanged,
      onUnavailable: onClose,
    });

  const steps = useMemo(
    () => [...data.steps].sort((left, right) => left.orderIndex - right.orderIndex),
    [data.steps],
  );
  const estimatedTotal = steps.reduce((total, step) => total + (step.estimatedMinutes ?? 0), 0);
  const finalized = isFinalOutcome(item);
  const canCompleteSteps = executable && !finalized;
  const formOpen = formMode !== null;

  function closeForm() {
    setFormMode(null);
    setEditingStep(null);
    setFormDirty(false);
  }

  async function moveStep(step: DailyPlanTaskStep, direction: -1 | 1) {
    const currentIndex = steps.findIndex((candidate) => candidate.id === step.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    await update(step, {
      title: step.title,
      guidance: step.guidance,
      orderIndex: nextIndex,
      estimatedMinutes: step.estimatedMinutes,
      required: step.required,
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const response = await remove(deleteTarget);
    if (response) setDeleteTarget(null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết nhiệm vụ"
      description={item.title}
      width="max-w-3xl"
      closeDisabled={Boolean(pendingKey)}
      confirmClose={formDirty || guidanceDirty}
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="indigo">{dailyTaskCategoryLabels[item.category]}</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <Clock3 className="size-3.5" />
                  {item.plannedMinutes ?? 30} phút
                </span>
              </div>
              {item.description && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
              loading={refreshing}
              disabled={Boolean(pendingKey)}
            >
              <RotateCw className="size-4" />
              Làm mới
            </Button>
          </div>

          {(item.studyUnit || item.learningUnitId) && (
            <div className="mt-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-inset ring-indigo-100">
              <p className="text-xs font-extrabold text-indigo-800">
                Đơn vị học:{" "}
                {item.studyUnit?.title ?? item.learningUnitTitle ?? item.roadmapItemTitle}
              </p>
              {(item.roadmapItem || item.parentTopicTitle) && (
                <p className="mt-1 text-xs text-indigo-600">
                  Chủ đề: {item.roadmapItem?.title ?? item.parentTopicTitle}
                </p>
              )}
            </div>
          )}
        </section>

        <section aria-label="Tiến độ các bước bắt buộc">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong className="text-slate-800">
              {data.progress.completedRequiredCount}/{data.progress.requiredCount} bước bắt buộc
            </strong>
            <span className="font-extrabold text-indigo-700">
              {Math.round(data.progress.completionPercentage)}%
            </span>
          </div>
          <ProgressBar value={data.progress.completionPercentage} />
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span>
              Đã phân bổ {estimatedTotal}/{item.plannedMinutes ?? 30} phút cho checklist
            </span>
            <span>Bước tùy chọn không ảnh hưởng phần trăm.</span>
          </div>
        </section>

        {editable && !formOpen && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormMode("create");
                setEditingStep(null);
              }}
              disabled={Boolean(pendingKey)}
            >
              <Plus className="size-4" />
              Thêm bước
            </Button>
          </div>
        )}

        {formOpen && (
          <TaskStepForm
            key={editingStep?.id ?? "create"}
            parentTitle={item.title}
            parentPlannedMinutes={item.plannedMinutes ?? 30}
            steps={steps}
            step={editingStep ?? undefined}
            loading={pendingKey === "create" || pendingKey?.startsWith("update:") === true}
            onDirtyChange={setFormDirty}
            onCancel={closeForm}
            onSubmit={async (input) => {
              if (editingStep) {
                return Boolean(
                  await update(editingStep, {
                    title: input.title,
                    guidance: input.guidance,
                    estimatedMinutes: input.estimatedMinutes,
                    required: input.required,
                    orderIndex: editingStep.orderIndex,
                  }),
                );
              }
              return Boolean(await create(input));
            }}
          />
        )}

        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <ListChecks className="mx-auto size-9 text-slate-300" />
            <h3 className="mt-3 font-extrabold text-slate-900">Chưa có bước thực hiện</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              Nhiệm vụ vẫn có thể được thực hiện và ghi nhận kết quả bình thường.
              {editable ? " Bạn có thể thêm checklist cho phiên bản DRAFT này." : ""}
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, index) => {
              const completionPending = pendingKey === `completion:${step.id}`;
              const deletionWouldRemoveOnlyRequired =
                step.required && data.progress.requiredCount === 1 && steps.length > 1;

              return (
                <li
                  key={step.id}
                  className={`rounded-2xl border p-4 transition ${
                    step.completed
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {canCompleteSteps ? (
                      <label className="mt-0.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg bg-slate-100">
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={(event) => void setCompletion(step, event.target.checked)}
                          disabled={Boolean(pendingKey)}
                          aria-label={`${step.completed ? "Bỏ hoàn thành" : "Hoàn thành"}: ${step.title}`}
                          className="size-4 accent-emerald-600"
                        />
                      </label>
                    ) : (
                      <span
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                          step.completed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Circle className="size-4" />
                        )}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-400">{index + 1}</span>
                        <h3
                          className={`text-sm font-extrabold ${
                            step.completed ? "text-slate-500 line-through" : "text-slate-900"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <Badge tone={step.required ? "indigo" : "slate"}>
                          {step.required ? "Bắt buộc" : "Tùy chọn"}
                        </Badge>
                      </div>
                      {step.guidance && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">{step.guidance}</p>
                      )}
                      {step.estimatedMinutes && (
                        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <Clock3 className="size-3.5" />
                          {step.estimatedMinutes} phút
                        </p>
                      )}
                    </div>

                    {completionPending && (
                      <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-indigo-600" />
                    )}

                    {editable && (
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-40"
                          onClick={() => void moveStep(step, -1)}
                          disabled={Boolean(pendingKey) || formOpen || index === 0}
                          aria-label={`Di chuyển ${step.title} lên trên`}
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-700 disabled:opacity-40"
                          onClick={() => void moveStep(step, 1)}
                          disabled={Boolean(pendingKey) || formOpen || index === steps.length - 1}
                          aria-label={`Di chuyển ${step.title} xuống dưới`}
                        >
                          <ArrowDown className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
                          onClick={() => {
                            setEditingStep(step);
                            setFormMode("edit");
                          }}
                          disabled={Boolean(pendingKey) || formOpen}
                          aria-label={`Chỉnh sửa ${step.title}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                          onClick={() => setDeleteTarget(step)}
                          disabled={
                            Boolean(pendingKey) || formOpen || deletionWouldRemoveOnlyRequired
                          }
                          aria-label={`Xóa ${step.title}`}
                          title={
                            deletionWouldRemoveOnlyRequired
                              ? "Hãy đặt một bước khác thành bắt buộc trước khi xóa."
                              : "Xóa bước"
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {deleteTarget?.id === step.id && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-rose-800">
                        Xóa bước này khỏi phiên bản DRAFT?
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeleteTarget(null)}
                          disabled={Boolean(pendingKey)}
                        >
                          Hủy
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void confirmDelete()}
                          loading={pendingKey === `delete:${step.id}`}
                        >
                          Xóa bước
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {finalized && steps.length > 0 && (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
            Nhiệm vụ đã có kết quả cuối cùng. Checklist hiện chỉ được xem lại.
          </div>
        )}

        <TaskGuidancePanel
          planId={planId}
          versionId={versionId}
          itemId={item.id}
          steps={steps}
          onDirtyChange={setGuidanceDirty}
        />

        {canCompleteSteps && data.progress.allRequiredStepsCompleted && (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-extrabold text-emerald-900">
                Đã hoàn thành tất cả bước bắt buộc
              </h3>
              <p className="mt-1 text-sm text-emerald-700">
                Hãy xác nhận kết quả cuối cùng của nhiệm vụ để cập nhật tiến độ học tập.
              </p>
            </div>
            <Button
              type="button"
              variant="success"
              onClick={() => onRecordOutcome(item)}
              disabled={Boolean(pendingKey)}
            >
              <CheckCircle2 className="size-4" />
              Ghi kết quả nhiệm vụ
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
