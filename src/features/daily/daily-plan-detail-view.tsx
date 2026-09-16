"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CopyPlus,
  Info,
  History,
  ListChecks,
  Plus,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageLoading, ProgressBar } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { dailyPlanStatusLabels, versionStatusLabels } from "@/lib/display-labels";
import type {
  DailyPlan,
  DailyPlanItem,
  DailyPlanTaskStepsResponse,
  DailyPlanVersion,
  DailyTaskCategory,
  ProgressEntryStatus,
  DailyEvaluation,
  AvailableLearningUnit,
  DailyPlanTaskProgressHistory,
  ProgressEntry,
} from "@/types/api";
import { DailyMicroQuizModal } from "@/features/evaluations/daily-micro-quiz-modal";
import { getDailyEvaluation } from "@/features/evaluations/evaluation-api";
import { DailyPlanAiExecutionStatus } from "./daily-plan-ai-execution-status";
import { PomodoroModal } from "./pomodoro-modal";
import { useDailyPlanAiExecution } from "./use-daily-plan-ai-execution";
import { dailyPlanApi, type ProgressInput } from "./daily-plan-api";
import { LearningUnitPicker } from "./learning-unit-picker";
import { DailyPlanProgressHistoryModal, ProgressHistoryModal } from "./progress-history-modal";
import { DailyPlanTaskCard } from "./daily-plan-task-card";
import { TaskStepDialog } from "./task-steps/task-step-dialog";

export function DailyPlanDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [versions, setVersions] = useState<DailyPlanVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiConfirmOpen, setAiConfirmOpen] = useState(false);
  const [activationConfirmOpen, setActivationConfirmOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState<DailyPlanItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<DailyPlanItem | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ProgressEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [planHistoryOpen, setPlanHistoryOpen] = useState(false);
  const [planHistory, setPlanHistory] = useState<DailyPlanTaskProgressHistory[]>([]);
  const [planHistoryLoading, setPlanHistoryLoading] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<ProgressEntry | null>(null);
  const [editTaskTarget, setEditTaskTarget] = useState<DailyPlanItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyPlanItem | null>(null);
  const [stepTargetId, setStepTargetId] = useState<string | null>(null);
  const [pomodoro, setPomodoro] = useState<{ open: boolean; taskId?: string }>({ open: false });
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [evaluation, setEvaluation] = useState<DailyEvaluation | null>(null);
  const [availableLearningUnits, setAvailableLearningUnits] = useState<AvailableLearningUnit[]>([]);
  const [learningUnitsLoading, setLearningUnitsLoading] = useState(false);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [nextPlan, nextVersions, nextEvaluation] = await Promise.all([
        apiRequest<DailyPlan>(`/api/v1/daily-plans/${id}`),
        apiRequest<DailyPlanVersion[]>(`/api/v1/daily-plans/${id}/versions`),
        getDailyEvaluation(id).catch(() => null),
      ]);
      setPlan(nextPlan);
      setVersions(nextVersions);
      setEvaluation(nextEvaluation);
      setSelectedId((current) =>
        current && nextVersions.some((item) => item.id === current)
          ? current
          : (nextVersions.find((item) => item.status === "DRAFT")?.id ??
            nextPlan.activeVersionId ??
            nextVersions[0]?.id ??
            null),
      );
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [id, show]);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  const handleAiSucceeded = useCallback(
    async (resultId: string) => {
      await load();
      setSelectedId(resultId);
      show("AI đã tạo xong phiên bản DRAFT mới.");
    },
    [load, show],
  );
  const {
    execution: aiExecution,
    recovering: aiRecovering,
    submitting: aiSubmitting,
    pollingError: aiPollingError,
    active: aiActive,
    generate: generateWithAi,
    regenerate: regenerateWithAi,
    refreshStatus: refreshAiStatus,
    dismissFailure: dismissAiFailure,
  } = useDailyPlanAiExecution(id, handleAiSucceeded);
  const version = useMemo(
    () => versions.find((item) => item.id === selectedId) ?? null,
    [versions, selectedId],
  );
  const stepTarget = useMemo(
    () => version?.items.find((item) => item.id === stepTargetId) ?? null,
    [stepTargetId, version],
  );
  const currentDraft = useMemo(
    () => versions.find((item) => item.status === "DRAFT") ?? null,
    [versions],
  );
  const aiBlockingMutations = aiRecovering || aiSubmitting || aiActive;
  const draftVersionSelected = version?.status === "DRAFT";
  const editable = draftVersionSelected && !aiBlockingMutations;
  const executable =
    version?.status === "ACTIVE" && plan && ["READY", "IN_PROGRESS"].includes(plan.status);
  const aiGenerationUnavailableReason = useMemo(() => {
    if (!plan) return null;
    if (!["DRAFT", "READY"].includes(plan.status)) {
      return "Chỉ có thể sinh kế hoạch AI trước khi kế hoạch bắt đầu được thực hiện.";
    }
    if (!plan.roadmapId) {
      return "Kế hoạch ngày cần được liên kết với một lộ trình ACTIVE trước khi AI có thể tạo nhiệm vụ.";
    }
    return null;
  }, [plan]);
  const canGenerateAi = !aiGenerationUnavailableReason && !aiBlockingMutations;
  const items = version?.items ?? [];
  const earned = items.reduce(
    (sum, item) =>
      sum + (item.status === "COMPLETED" ? 100 : item.status === "PARTIALLY_COMPLETED" ? 50 : 0),
    0,
  );
  const completion = items.length ? Math.round((earned / items.length) * 10) / 10 : 0;

  const updateTaskSteps = useCallback((versionId: string, response: DailyPlanTaskStepsResponse) => {
    setVersions((current) =>
      current.map((candidateVersion) =>
        candidateVersion.id !== versionId
          ? candidateVersion
          : {
              ...candidateVersion,
              items: candidateVersion.items.map((candidateItem) =>
                candidateItem.id !== response.dailyPlanItemId
                  ? candidateItem
                  : {
                      ...candidateItem,
                      steps: response.steps,
                      stepProgress: response.progress,
                    },
              ),
            },
      ),
    );
  }, []);
  async function action(run: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await run();
      show(message);
      await load();
      return true;
    } catch (error) {
      show(getErrorMessage(error), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function loadAvailableLearningUnits() {
    if (!plan?.roadmapId) {
      setAvailableLearningUnits([]);
      return;
    }

    setLearningUnitsLoading(true);
    try {
      setAvailableLearningUnits(await dailyPlanApi.getAvailableLearningUnits(id));
    } catch (error) {
      setAvailableLearningUnits([]);
      show(getErrorMessage(error), "error");
    } finally {
      setLearningUnitsLoading(false);
    }
  }

  async function openAddTask() {
    setAddOpen(true);
    await loadAvailableLearningUnits();
  }

  async function openEditTask(item: DailyPlanItem) {
    setEditTaskTarget(item);
    await loadAvailableLearningUnits();
  }

  async function openProgressHistory(item: DailyPlanItem) {
    setHistoryTarget(item);
    setHistoryEntries([]);
    setHistoryLoading(true);
    try {
      setHistoryEntries(await dailyPlanApi.getProgressHistory(id, item.id));
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openPlanProgressHistory() {
    setPlanHistoryOpen(true);
    setPlanHistory([]);
    setPlanHistoryLoading(true);
    try {
      setPlanHistory(await dailyPlanApi.getPlanProgressHistory(id));
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setPlanHistoryLoading(false);
    }
  }

  async function recordProgress(
    item: DailyPlanItem,
    values: ProgressInput,
    idempotencyKey: string,
  ): Promise<boolean> {
    try {
      await dailyPlanApi.recordProgress(id, item.id, values, idempotencyKey);
      show("Tiến độ đã được ghi vào lịch sử.");
      await load();
      return true;
    } catch (error) {
      show(getErrorMessage(error), "error");
      return false;
    }
  }

  async function correctProgress(
    item: DailyPlanItem,
    entry: ProgressEntry,
    values: ProgressInput,
    idempotencyKey: string,
  ): Promise<boolean> {
    try {
      await dailyPlanApi.correctProgress(id, item.id, entry.id, values, idempotencyKey);
      show("Đã lưu bản sửa mà không ghi đè lịch sử cũ.");
      await load();
      setHistoryEntries(await dailyPlanApi.getProgressHistory(id, item.id));
      return true;
    } catch (error) {
      show(getErrorMessage(error), "error");
      return false;
    }
  }
  async function createDraft() {
    await action(async () => {
      const created = await apiRequest<DailyPlanVersion>(`/api/v1/daily-plans/${id}/versions`, {
        method: "POST",
      });
      setSelectedId(created.id);
    }, "Đã tạo phiên bản DRAFT mới; phiên bản ACTIVE chưa bị thay đổi.");
  }
  async function handleGenerateAiDraft() {
    if (!canGenerateAi) return;
    if (currentDraft && currentDraft.items.length > 0) {
      setAiConfirmOpen(true);
      return;
    }
    await executeGenerateAiDraft();
  }
  async function executeGenerateAiDraft() {
    setAiConfirmOpen(false);
    try {
      if (currentDraft && currentDraft.items.length > 0) {
        await regenerateWithAi();
      } else {
        await generateWithAi();
      }
      show("Yêu cầu đã được tiếp nhận. Bạn có thể rời trang trong lúc AI xử lý.");
    } catch (error) {
      show(getErrorMessage(error), "error");
    }
  }
  async function handleActivate() {
    if (!version) return;
    if (version.requiresUserDecision) {
      setActivationConfirmOpen(true);
      return;
    }
    await executeActivate();
  }
  async function executeActivate() {
    if (!version) return;
    setActivationConfirmOpen(false);
    await action(
      () =>
        apiRequest<DailyPlan>(`/api/v1/daily-plans/${id}/versions/${version.id}/activate`, {
          method: "POST",
        }),
      "Kế hoạch đã được kích hoạt và sẵn sàng thực hiện.",
    );
  }
  async function remove() {
    if (!version || !deleteTarget) return;
    const removed = await action(
      () =>
        apiRequest<DailyPlanVersion>(
          `/api/v1/daily-plans/${id}/versions/${version.id}/items/${deleteTarget.id}`,
          { method: "DELETE" },
        ),
      "Nhiệm vụ đã được xóa khỏi bản DRAFT.",
    );
    if (removed) setDeleteTarget(null);
  }
  const recordPomodoro = useCallback(
    async (taskId: string, minutes: number) => {
      try {
        await apiRequest<DailyPlanItem>(`/api/v1/daily-plans/${id}/items/${taskId}/pomodoro`, {
          method: "POST",
          body: JSON.stringify({ completedMinutes: minutes }),
        });
        show(`Đã ghi nhận ${minutes} phút Pomodoro.`);
        await load();
      } catch (error) {
        show(getErrorMessage(error), "error");
      }
    },
    [id, load, show],
  );
  if (loading && !plan) return <PageLoading label="Đang mở kế hoạch ngày…" />;
  if (!plan)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        Không thể tải kế hoạch.
      </div>
    );
  return (
    <div className="space-y-6 animate-fade-up">
      <button
        onClick={() => router.push("/daily-plans")}
        className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700"
      >
        <ArrowLeft className="size-4" />
        Lịch sử kế hoạch
      </button>
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  tone={
                    plan.status === "IN_PROGRESS"
                      ? "indigo"
                      : plan.status === "COMPLETED"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {dailyPlanStatusLabels[plan.status]}
                </Badge>
                <Badge>{plan.timeZoneSnapshot}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                {formatDateOnly(plan.planDate, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quỹ thời gian {version?.availableMinutes ?? plan.availableMinutes} phút · tổng dự
                kiến {version?.totalPlannedMinutes ?? 0} phút
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleGenerateAiDraft()}
                loading={aiSubmitting || aiRecovering}
                disabled={!canGenerateAi}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-none shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              >
                <Sparkles className="size-4" />
                {aiActive
                  ? "AI đang xử lý..."
                  : aiSubmitting || aiRecovering
                    ? "Đang gửi yêu cầu..."
                    : currentDraft
                      ? "Sinh lại kế hoạch AI"
                      : "Sinh kế hoạch AI"}
              </Button>
              {editable && (
                <Button variant="secondary" onClick={() => void openAddTask()}>
                  <Plus className="size-4" />
                  Thêm nhiệm vụ
                </Button>
              )}
              <Button variant="secondary" onClick={() => void openPlanProgressHistory()}>
                <History className="size-4" />
                Lịch sử tiến độ
              </Button>
              {editable && (
                <Button
                  variant="success"
                  onClick={() => void handleActivate()}
                  loading={busy}
                  disabled={items.length === 0}
                >
                  <CheckCircle2 className="size-4" />
                  Kích hoạt
                </Button>
              )}
              {!draftVersionSelected && !aiBlockingMutations && (
                <Button onClick={() => void createDraft()} loading={busy}>
                  <CopyPlus className="size-4" />
                  Tạo bản chỉnh sửa
                </Button>
              )}
              {executable && (
                <Button variant="danger" onClick={() => setPomodoro({ open: true })}>
                  <Timer className="size-4" />
                  Pomodoro
                </Button>
              )}
              {items.some((item) => item.status === "COMPLETED") && (
                <Button
                  onClick={() => setQuizModalOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-none shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                >
                  <Sparkles className="size-4" />
                  {evaluation?.quizScore != null
                    ? `Xem lại Quiz (${evaluation.quizScore}%)`
                    : "Làm Micro-Quiz cuối ngày"}
                </Button>
              )}
            </div>
          </div>
          {aiGenerationUnavailableReason && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <p>{aiGenerationUnavailableReason}</p>
            </div>
          )}
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Tiến độ" value={`${completion}%`}>
              <ProgressBar value={completion} />
            </Metric>
            <Metric
              label="Nhiệm vụ"
              value={`${items.filter((item) => item.status === "COMPLETED").length}/${items.length}`}
            />
            <Metric
              label="Thời lượng dự kiến"
              value={`${version?.totalPlannedMinutes ?? 0} phút`}
            />
            {evaluation?.quizScore != null ? (
              <Metric label="Micro-Quiz cuối ngày" value={`${evaluation.quizScore}%`}>
                <Badge tone={evaluation.quizPassed ? "emerald" : "rose"}>
                  {evaluation.quizPassed ? "Đạt (≥ 80%)" : "Chưa đạt"}
                </Badge>
              </Metric>
            ) : (
              <Metric label="Micro-Quiz cuối ngày" value="Chưa làm">
                {items.some((item) => item.status === "COMPLETED") ? (
                  <span className="text-xs font-semibold text-amber-600">Sẵn sàng làm bài</span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Cần hoàn thành task</span>
                )}
              </Metric>
            )}
          </div>
        </div>
      </Card>
      <DailyPlanAiExecutionStatus
        execution={aiExecution}
        recovering={aiRecovering}
        pollingError={aiPollingError}
        onRefresh={refreshAiStatus}
        onDismiss={dismissAiFailure}
      />
      <div className="grid gap-6 xl:grid-cols-[17rem_1fr]">
        <Card className="h-fit p-4">
          <h3 className="px-2 py-1 text-sm font-black">Phiên bản kế hoạch</h3>
          <div className="mt-3 grid gap-2">
            {versions.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setStepTargetId(null);
                  setSelectedId(item.id);
                }}
                className={`focus-ring rounded-xl border p-3 text-left ${selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm">Version {item.versionNumber}</strong>
                  <Badge
                    tone={
                      item.status === "ACTIVE"
                        ? "emerald"
                        : item.status === "DRAFT"
                          ? "indigo"
                          : "slate"
                    }
                  >
                    {versionStatusLabels[item.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {item.items.length} nhiệm vụ · {item.totalPlannedMinutes} phút
                </p>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          {version?.requiresUserDecision && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-inset ring-amber-500/20">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <h4 className="font-bold text-amber-800">⚠ Kế hoạch cần bạn quyết định</h4>
                <p className="mt-1 text-sm leading-relaxed">
                  Kế hoạch đã nằm trong quỹ thời gian, nhưng AI có đề xuất chuyển tiếp, chia nhỏ,
                  dời lịch hoặc bỏ bớt nhiệm vụ. Hãy xem giải thích và chỉnh sửa nếu cần trước khi
                  kích hoạt.
                </p>
              </div>
            </div>
          )}
          {version?.aiExplanation && (
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/50 p-4 text-indigo-900 ring-1 ring-inset ring-indigo-500/20">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-indigo-600" />
              <div>
                <h4 className="font-bold text-indigo-800">✨ AI đề xuất</h4>
                <p className="mt-1 text-sm leading-relaxed">{version.aiExplanation}</p>
              </div>
            </div>
          )}
          {items.length === 0 ? (
            <Card className="grid min-h-72 place-items-center border-dashed p-8 text-center">
              <div>
                <ListChecks className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-4 font-black">Chưa có nhiệm vụ</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Thêm task thủ công vào phiên bản DRAFT này.
                </p>
                {editable && (
                  <Button className="mt-5" onClick={() => void openAddTask()}>
                    <Plus className="size-4" />
                    Thêm nhiệm vụ
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            items.map((item) => (
              <DailyPlanTaskCard
                key={item.id}
                item={item}
                editable={Boolean(editable)}
                executable={Boolean(executable)}
                onEdit={() => void openEditTask(item)}
                onDelete={() => setDeleteTarget(item)}
                onProgress={() => setProgressTarget(item)}
                onHistory={() => void openProgressHistory(item)}
                onPomodoro={() => setPomodoro({ open: true, taskId: item.id })}
                onOpenSteps={() => setStepTargetId(item.id)}
              />
            ))
          )}
        </div>
      </div>
      {version && addOpen && (
        <AddTaskModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          availableLearningUnits={availableLearningUnits}
          learningUnitsLoading={learningUnitsLoading}
          onSave={async (values) => {
            const saved = await action(
              () => dailyPlanApi.addTask(id, version.id, values),
              "Đã thêm nhiệm vụ vào bản DRAFT.",
            );
            if (saved) setAddOpen(false);
          }}
        />
      )}
      {version && editTaskTarget && (
        <EditTaskModal
          open
          item={editTaskTarget}
          onClose={() => setEditTaskTarget(null)}
          availableLearningUnits={availableLearningUnits}
          learningUnitsLoading={learningUnitsLoading}
          onSave={async (values) => {
            const saved = await action(
              () => dailyPlanApi.updateTask(id, version.id, editTaskTarget.id, values),
              "Đã cập nhật nhiệm vụ trong bản DRAFT.",
            );
            if (saved) setEditTaskTarget(null);
          }}
        />
      )}
      {version && stepTarget && (
        <TaskStepDialog
          open
          planId={id}
          versionId={version.id}
          item={stepTarget}
          editable={Boolean(editable)}
          executable={Boolean(executable)}
          onClose={() => setStepTargetId(null)}
          onStepsChanged={(response) => updateTaskSteps(version.id, response)}
          onRecordOutcome={(item) => {
            setStepTargetId(null);
            setProgressTarget(item);
          }}
        />
      )}
      {progressTarget && (
        <ProgressModal
          open
          item={progressTarget}
          onClose={() => setProgressTarget(null)}
          onSave={async (values, idempotencyKey) => {
            const saved = await recordProgress(progressTarget, values, idempotencyKey);
            if (saved) setProgressTarget(null);
            return saved;
          }}
        />
      )}
      {historyTarget && !correctionTarget && (
        <ProgressHistoryModal
          item={historyTarget}
          entries={historyEntries}
          loading={historyLoading}
          onClose={() => setHistoryTarget(null)}
          onCorrect={setCorrectionTarget}
        />
      )}
      {historyTarget && correctionTarget && (
        <ProgressModal
          open
          item={historyTarget}
          initialEntry={correctionTarget}
          title="Sửa kết quả tiến độ"
          onClose={() => setCorrectionTarget(null)}
          onSave={async (values, idempotencyKey) => {
            const saved = await correctProgress(
              historyTarget,
              correctionTarget,
              values,
              idempotencyKey,
            );
            if (saved) setCorrectionTarget(null);
            return saved;
          }}
        />
      )}
      {planHistoryOpen && (
        <DailyPlanProgressHistoryModal
          histories={planHistory}
          loading={planHistoryLoading}
          onClose={() => setPlanHistoryOpen(false)}
        />
      )}
      {pomodoro.open && (
        <PomodoroModal
          open
          onClose={() => setPomodoro({ open: false })}
          items={items}
          initialTaskId={pomodoro.taskId}
          onComplete={recordPomodoro}
        />
      )}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        closeDisabled={busy}
        title="Xóa nhiệm vụ?"
        description="Nhiệm vụ sẽ được gỡ khỏi bản DRAFT. Lịch sử tiến độ đã ghi vẫn được hệ thống bảo toàn."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void remove()}>
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </Modal>
      <Modal
        open={aiConfirmOpen}
        onClose={() => setAiConfirmOpen(false)}
        closeDisabled={aiSubmitting}
        title="Sinh lại bản nháp?"
        description="Bản DRAFT hiện tại sẽ được giữ trong lịch sử ở trạng thái SUPERSEDED. AI sẽ tạo một phiên bản DRAFT mới và không ghi đè nội dung cũ."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAiConfirmOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => void executeGenerateAiDraft()}
            loading={aiSubmitting}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-none"
          >
            <Sparkles className="size-4" />
            Sinh bản mới
          </Button>
        </div>
      </Modal>
      <Modal
        open={activationConfirmOpen}
        onClose={() => setActivationConfirmOpen(false)}
        closeDisabled={busy}
        title="Xác nhận các đề xuất của AI?"
        description="Phiên bản này có đề xuất cần bạn xem xét. Khi kích hoạt, bạn xác nhận sử dụng nội dung hiện tại; các đề xuất bị dời hoặc bỏ không được tự động thêm lại."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setActivationConfirmOpen(false)}>
            Xem lại
          </Button>
          <Button variant="success" loading={busy} onClick={() => void executeActivate()}>
            <CheckCircle2 className="size-4" />
            Xác nhận và kích hoạt
          </Button>
        </div>
      </Modal>
      <DailyMicroQuizModal
        dailyPlanId={id}
        dailyPlanVersionId={plan?.activeVersionId}
        open={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        onQuizSubmitted={() => void load()}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
function EditTaskModal({
  open,
  item,
  onClose,
  availableLearningUnits,
  learningUnitsLoading,
  onSave,
}: {
  open: boolean;
  item: DailyPlanItem;
  onClose: () => void;
  availableLearningUnits: AvailableLearningUnit[];
  learningUnitsLoading: boolean;
  onSave: (values: {
    title: string;
    description: string;
    category: DailyTaskCategory;
    plannedMinutes: number;
    orderIndex: number;
    learningUnitId?: string | null;
    clearLearningUnit?: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState<DailyTaskCategory>(item.category);
  const [minutes, setMinutes] = useState(item.plannedMinutes ?? 30);
  const [position, setPosition] = useState((item.orderIndex ?? 0) + 1);
  const originalLearningUnitId =
    item.studyUnit?.id ?? item.learningUnitId ?? item.roadmapItemId ?? null;
  const [learningUnitId, setLearningUnitId] = useState<string | null>(originalLearningUnitId);
  const [loading, setLoading] = useState(false);
  const dirty =
    title.trim() !== item.title ||
    description.trim() !== (item.description ?? "") ||
    category !== item.category ||
    minutes !== (item.plannedMinutes ?? 30) ||
    position !== (item.orderIndex ?? 0) + 1 ||
    learningUnitId !== originalLearningUnitId;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        plannedMinutes: minutes,
        orderIndex: position - 1,
        learningUnitId,
        clearLearningUnit: Boolean(originalLearningUnitId && !learningUnitId),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chỉnh sửa nhiệm vụ"
      description="Thay đổi chỉ áp dụng cho phiên bản DRAFT đang chọn."
      closeDisabled={loading}
      confirmClose={dirty}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên nhiệm vụ">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field label="Mô tả">
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <LearningUnitPicker
          units={availableLearningUnits}
          value={learningUnitId}
          loading={learningUnitsLoading}
          onChange={(unit) => setLearningUnitId(unit?.id ?? null)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nhóm">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as DailyTaskCategory)}
            >
              <option value="CUSTOM">Tùy chỉnh</option>
              <option value="REVIEW">Ôn tập</option>
              <option value="NEW_MATERIAL">Kiến thức mới</option>
              <option value="PRACTICE">Thực hành</option>
            </Select>
          </Field>
          <Field label="Dự kiến (phút)">
            <Input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              required
            />
          </Field>
          <Field label="Vị trí">
            <Input
              type="number"
              min={1}
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              required
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading} disabled={!title.trim() || !dirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function AddTaskModal({
  open,
  onClose,
  availableLearningUnits,
  learningUnitsLoading,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  availableLearningUnits: AvailableLearningUnit[];
  learningUnitsLoading: boolean;
  onSave: (values: {
    title: string;
    description: string;
    category: DailyTaskCategory;
    plannedMinutes: number;
    learningUnitId: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DailyTaskCategory>("CUSTOM");
  const [minutes, setMinutes] = useState(30);
  const [learningUnitId, setLearningUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        plannedMinutes: minutes,
        learningUnitId,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm nhiệm vụ thủ công"
      description="Task chỉ được thêm vào phiên bản DRAFT đang chọn."
      closeDisabled={loading}
      confirmClose={Boolean(
        title.trim() ||
        description.trim() ||
        category !== "CUSTOM" ||
        minutes !== 30 ||
        learningUnitId,
      )}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên nhiệm vụ">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field label="Mô tả">
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <LearningUnitPicker
          units={availableLearningUnits}
          value={learningUnitId}
          loading={learningUnitsLoading}
          onChange={(unit) => setLearningUnitId(unit?.id ?? null)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nhóm">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as DailyTaskCategory)}
            >
              <option value="CUSTOM">Tùy chỉnh</option>
              <option value="REVIEW">Ôn tập</option>
              <option value="NEW_MATERIAL">Kiến thức mới</option>
              <option value="PRACTICE">Thực hành</option>
            </Select>
          </Field>
          <Field label="Dự kiến (phút)">
            <Input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              required
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading} disabled={!title.trim()}>
            Thêm task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ProgressModal({
  open,
  item,
  initialEntry,
  title = "Ghi nhận kết quả",
  onClose,
  onSave,
}: {
  open: boolean;
  item: DailyPlanItem;
  initialEntry?: ProgressEntry;
  title?: string;
  onClose: () => void;
  onSave: (values: ProgressInput, idempotencyKey: string) => Promise<boolean>;
}) {
  const initialStatus: ProgressEntryStatus =
    initialEntry?.status ??
    (item.status === "PARTIALLY_COMPLETED" || item.status === "SKIPPED"
      ? item.status
      : "COMPLETED");
  const [status, setStatus] = useState<ProgressEntryStatus>(initialStatus);
  const [minutes, setMinutes] = useState(initialEntry?.actualMinutes ?? item.plannedMinutes ?? 30);
  const [result, setResult] = useState(initialEntry?.actualResult ?? "");
  const [difficulty, setDifficulty] = useState(initialEntry?.difficulty ?? 3);
  const [understanding, setUnderstanding] = useState(initialEntry?.understandingRating ?? 3);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(
        {
          status,
          actualMinutes: minutes,
          actualResult: result,
          difficulty,
          understandingRating: understanding,
          note,
        },
        idempotencyKey,
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={item.title}
      closeDisabled={loading}
      confirmClose={Boolean(
        status !== initialStatus ||
        result.trim() !== (initialEntry?.actualResult ?? "") ||
        note.trim() !== (initialEntry?.note ?? "") ||
        minutes !== (initialEntry?.actualMinutes ?? item.plannedMinutes ?? 30) ||
        difficulty !== (initialEntry?.difficulty ?? 3) ||
        understanding !== (initialEntry?.understandingRating ?? 3),
      )}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Kết quả">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "COMPLETED", label: "Hoàn thành" },
                { value: "PARTIALLY_COMPLETED", label: "Một phần" },
                { value: "SKIPPED", label: "Bỏ qua" },
              ] as const
            ).map((option) => (
              <button
                type="button"
                aria-pressed={status === option.value}
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`focus-ring rounded-xl border px-2 py-3 text-xs font-bold ${status === option.value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phút thực tế">
            <Input
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </Field>
          <Field label="Độ khó (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value))}
            />
          </Field>
          <Field label="Mức hiểu (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={understanding}
              onChange={(event) => setUnderstanding(Number(event.target.value))}
            />
          </Field>
        </div>
        <Field label="Kết quả thực tế">
          <Input
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Bạn đã làm được gì?"
          />
        </Field>
        <Field label="Ghi chú">
          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Khó khăn, điểm cần xem lại…"
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading}>
            Lưu tiến độ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
