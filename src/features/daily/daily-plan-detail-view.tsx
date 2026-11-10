"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CopyPlus,
  History,
  Info,
  ListChecks,
  MoreVertical,
  Play,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { PageLoading, ProgressBar } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatDateOnly, todayIso } from "@/lib/format";
import { dailyPlanStatusLabels, versionStatusLabels } from "@/lib/display-labels";
import { isValidStudyDuration } from "@/lib/study-duration";
import type {
  DailyPlan,
  DailyPlanItem,
  DailyPlanTaskStep,
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
import { DailyPlanKanbanBoard } from "./kanban/daily-plan-kanban-board";
import { PomodoroModal } from "./pomodoro-modal";
import { useDailyPlanAiExecution } from "./use-daily-plan-ai-execution";
import { dailyPlanApi, type ProgressInput } from "./daily-plan-api";
import { LearningUnitPicker } from "./learning-unit-picker";
import { DailyPlanProgressHistoryModal, ProgressHistoryModal } from "./progress-history-modal";
import { DailyPlanTaskCard } from "./daily-plan-task-card";
import { TaskStepDialog } from "./task-steps/task-step-dialog";

interface PrimaryActionConfig {
  label: string;
  icon: typeof CheckCircle2;
  onClick: () => void;
  variant: "primary" | "secondary" | "success";
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

function incompleteRequiredStepCount(item: DailyPlanItem): number {
  if (!item.stepProgress) return 0;
  return Math.max(0, item.stepProgress.requiredCount - item.stepProgress.completedRequiredCount);
}

export function DailyPlanDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
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
  const [progressInitialStatus, setProgressInitialStatus] = useState<ProgressEntryStatus | null>(
    null,
  );
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [completionStepTarget, setCompletionStepTarget] = useState<DailyPlanTaskStep | null>(null);
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
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetMinutes, setBudgetMinutes] = useState<number | undefined>();
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
  const activeVersion = useMemo(
    () => versions.find((item) => item.status === "ACTIVE") ?? null,
    [versions],
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
      sum +
      (item.completionPercentage ??
        (item.status === "COMPLETED" ? 100 : item.status === "PARTIALLY_COMPLETED" ? 50 : 0)),
    0,
  );
  const completion = items.length ? Math.round((earned / items.length) * 10) / 10 : 0;

  // Next actionable task in the selected version (AC3)
  const nextTask = useMemo(() => {
    if (!items.length) return null;
    const inProgress = items.find((i) => i.status === "IN_PROGRESS");
    if (inProgress) return inProgress;
    return (
      items.find((i) => i.status === "NOT_STARTED" || i.status === "PARTIALLY_COMPLETED") ?? null
    );
  }, [items]);

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
      if (isApiErrorCode(error, "TASK_REQUIRED_STEPS_INCOMPLETE")) {
        show("Hãy hoàn thành mọi bước bắt buộc trước khi hoàn thành nhiệm vụ.", "error");
        setProgressTarget(null);
        setCompletionStepTarget(null);
        setProgressInitialStatus(null);
        await load();
        setStepTargetId(item.id);
        return false;
      }
      show(getErrorMessage(error), "error");
      return false;
    }
  }

  async function startTask(item: DailyPlanItem) {
    if (startingTaskId) return;
    setStartingTaskId(item.id);
    try {
      const updated = await dailyPlanApi.startTask(id, item.id);
      setVersions((current) =>
        current.map((candidateVersion) =>
          candidateVersion.id !== updated.versionId
            ? candidateVersion
            : {
                ...candidateVersion,
                items: candidateVersion.items.map((candidateItem) =>
                  candidateItem.id === updated.id ? updated : candidateItem,
                ),
              },
        ),
      );
      setPlan((current) =>
        current && current.status === "READY" ? { ...current, status: "IN_PROGRESS" } : current,
      );
      show("Nhiệm vụ đã chuyển sang Đang học.");
    } catch (error) {
      show(getErrorMessage(error), "error");
      await load();
    } finally {
      setStartingTaskId(null);
    }
  }

  function requestOutcome(item: DailyPlanItem, status?: ProgressEntryStatus) {
    const remainingRequiredSteps = incompleteRequiredStepCount(item);
    if (status === "COMPLETED" && remainingRequiredSteps > 0) {
      show(
        `Còn ${remainingRequiredSteps} bước bắt buộc. Hoàn thành checklist trước khi hoàn thành nhiệm vụ.`,
        "error",
      );
      setStepTargetId(item.id);
      return;
    }
    setCompletionStepTarget(null);
    setProgressInitialStatus(status ?? null);
    setProgressTarget(item);
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
  function openBudgetEditor() {
    if (!version || version.status !== "DRAFT") return;
    setBudgetMinutes(version.availableMinutes);
    setBudgetOpen(true);
  }
  async function saveBudget() {
    if (!version || !isValidStudyDuration(budgetMinutes)) return;
    setBusy(true);
    try {
      const updated = await dailyPlanApi.updateBudget(
        id,
        version.id,
        budgetMinutes,
        version.entityVersion,
      );
      setVersions((current) =>
        current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
      setBudgetOpen(false);
      show("Đã cập nhật quỹ thời gian cho phiên bản DRAFT này.");
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
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

  // AC1: Exactly one primary action determined by state
  const primaryAction = useMemo<PrimaryActionConfig | null>(() => {
    if (!version) return null;

    // 1. DRAFT version
    if (draftVersionSelected) {
      if (items.length === 0) {
        return {
          label: "Thêm nhiệm vụ",
          icon: Plus,
          onClick: () => {
            void openAddTask();
          },
          variant: "primary",
          disabled: false,
          tooltip: "Thêm nhiệm vụ đầu tiên vào bản DRAFT",
        };
      }
      return {
        label: "Kích hoạt kế hoạch",
        icon: CheckCircle2,
        onClick: () => {
          void handleActivate();
        },
        variant: "success",
        loading: busy,
        disabled: items.length === 0,
        tooltip: "Kích hoạt phiên bản này để bắt đầu học",
      };
    }

    // 2. ACTIVE version
    if (version.status === "ACTIVE") {
      if (plan?.status === "READY") {
        if (nextTask) {
          return {
            label: "Bắt đầu học",
            icon: Play,
            onClick: () => {
              setPomodoro({ open: true, taskId: nextTask.id });
            },
            variant: "success",
            tooltip: `Bắt đầu học nhiệm vụ: ${nextTask.title}`,
          };
        }
        return {
          label: "Tạo bản chỉnh sửa",
          icon: CopyPlus,
          onClick: () => {
            void createDraft();
          },
          variant: "primary",
          loading: busy,
          tooltip: "Tạo bản DRAFT mới để thêm nhiệm vụ",
        };
      }

      if (plan?.status === "IN_PROGRESS") {
        if (nextTask) {
          return {
            label: nextTask.status === "IN_PROGRESS" ? "Tiếp tục học" : "Bắt đầu nhiệm vụ",
            icon: Timer,
            onClick: () => {
              setPomodoro({ open: true, taskId: nextTask.id });
            },
            variant: "primary",
            tooltip: `Học nhiệm vụ tiếp theo: ${nextTask.title}`,
          };
        }
        if (evaluation?.quizScore == null) {
          return {
            label: "Làm Micro-Quiz cuối ngày",
            icon: Sparkles,
            onClick: () => {
              setQuizModalOpen(true);
            },
            variant: "primary",
            tooltip: "Làm bài kiểm tra đánh giá kiến thức cuối ngày",
          };
        }
        return {
          label: `Xem lại Quiz (${evaluation.quizScore}%)`,
          icon: Sparkles,
          onClick: () => {
            setQuizModalOpen(true);
          },
          variant: "secondary",
          tooltip: "Xem lại kết quả Micro-Quiz đã hoàn thành",
        };
      }

      if (plan?.status === "COMPLETED") {
        if (evaluation?.quizScore == null) {
          return {
            label: "Làm Micro-Quiz cuối ngày",
            icon: Sparkles,
            onClick: () => {
              setQuizModalOpen(true);
            },
            variant: "primary",
            tooltip: "Làm bài kiểm tra đánh giá",
          };
        }
        return {
          label: `Xem lại Quiz (${evaluation.quizScore}%)`,
          icon: Sparkles,
          onClick: () => {
            setQuizModalOpen(true);
          },
          variant: "secondary",
          tooltip: "Xem lại kết quả Micro-Quiz",
        };
      }
    }

    // 3. SUPERSEDED version
    if (version.status === "SUPERSEDED") {
      if (activeVersion) {
        return {
          label: "Về bản ACTIVE hiện tại",
          icon: CheckCircle2,
          onClick: () => {
            setStepTargetId(null);
            setSelectedId(activeVersion.id);
          },
          variant: "primary",
          tooltip: "Quay lại phiên bản đang hoạt động",
        };
      }
      return {
        label: "Tạo bản chỉnh sửa",
        icon: CopyPlus,
        onClick: () => {
          void createDraft();
        },
        variant: "primary",
        loading: busy,
        tooltip: "Tạo phiên bản DRAFT mới từ bản này",
      };
    }

    // Fallback default
    if (executable && nextTask) {
      return {
        label: "Tiếp tục học",
        icon: Timer,
        onClick: () => {
          setPomodoro({ open: true, taskId: nextTask.id });
        },
        variant: "primary",
        tooltip: "Tiếp tục việc học",
      };
    }

    return null;
  }, [
    version,
    draftVersionSelected,
    items.length,
    plan?.status,
    nextTask,
    evaluation?.quizScore,
    busy,
    activeVersion,
    executable,
  ]);
  if (loading && !plan) return <PageLoading label="Đang mở kế hoạch ngày…" />;
  if (!plan)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        Không thể tải kế hoạch.
      </div>
    );
  const userTimeZone = profile?.profile?.timeZone || plan.timeZoneSnapshot || "Asia/Ho_Chi_Minh";
  const todayDateString = todayIso(userTimeZone);
  const isToday = plan.planDate === todayDateString;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/daily-plans")}
          className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700"
        >
          <ArrowLeft className="size-4" />
          Lịch sử kế hoạch
        </button>

        {!isToday && (
          <button
            onClick={() => router.push("/daily-plans/today")}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
            title="Quay về công việc học của ngày hôm nay"
          >
            <CalendarCheck2 className="size-3.5 text-indigo-600" />
            Về kế hoạch hôm nay
          </button>
        )}
      </div>

      {/* Header Card: Date, Status, and AC1/AC2 Toolbar */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
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
                {version && (
                  <Badge
                    tone={
                      version.status === "ACTIVE"
                        ? "emerald"
                        : version.status === "DRAFT"
                          ? "indigo"
                          : "slate"
                    }
                  >
                    Version {version.versionNumber} ({versionStatusLabels[version.status]})
                  </Badge>
                )}
                {evaluation?.quizScore != null && (
                  <Badge tone={evaluation.quizPassed ? "emerald" : "rose"}>
                    Micro-Quiz {evaluation.quizScore}% ·{" "}
                    {evaluation.quizPassed ? "Đạt" : "Chưa đạt"}
                  </Badge>
                )}
                <Badge>{plan.timeZoneSnapshot}</Badge>
              </div>
              <h2 className="mt-2.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {formatDateOnly(plan.planDate, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="mt-1.5 text-xs font-medium text-slate-500 sm:text-sm">
                Quỹ thời gian {version?.availableMinutes ?? plan.availableMinutes} phút · Dự kiến{" "}
                {version?.totalPlannedMinutes ?? 0} phút · Đã hoàn thành{" "}
                {items.filter((i) => i.status === "COMPLETED").length}/{items.length} nhiệm vụ (
                {completion}%)
              </p>
            </div>

            {/* Toolbar - AC1: Exactly one primary action highlighted + AC2: Progressive disclosure */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="focus-within:ring-2 focus-within:ring-indigo-200 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xs">
                <span className="sr-only">Chọn phiên bản kế hoạch</span>
                <select
                  aria-label="Chọn phiên bản kế hoạch"
                  value={selectedId ?? version?.id ?? ""}
                  onChange={(event) => {
                    setStepTargetId(null);
                    setSelectedId(event.target.value);
                  }}
                  className="min-w-36 bg-transparent font-bold text-slate-900 outline-none"
                >
                  {versions.map((item) => (
                    <option key={item.id} value={item.id}>
                      Version {item.versionNumber} · {versionStatusLabels[item.status]}
                    </option>
                  ))}
                </select>
              </label>

              {/* Secondary quick action when in DRAFT: Add Task */}
              {editable && items.length > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => void openAddTask()}
                  className="shadow-xs"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Thêm nhiệm vụ</span>
                </Button>
              )}

              {/* Single Primary Action Button (AC1) */}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant}
                  size="md"
                  onClick={primaryAction.onClick}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                  className={cn(
                    "shadow-sm font-black text-xs sm:text-sm",
                    primaryAction.variant === "success" &&
                      "bg-emerald-600 hover:bg-emerald-700 text-white",
                    primaryAction.variant === "primary" &&
                      "bg-indigo-600 hover:bg-indigo-700 text-white",
                  )}
                  title={primaryAction.tooltip}
                >
                  <primaryAction.icon className="size-4" />
                  {primaryAction.label}
                </Button>
              )}

              {/* Progressive disclosure: More options menu (AC2) */}
              <MoreActionsMenu
                canGenerateAi={canGenerateAi}
                aiActive={aiActive}
                aiSubmitting={aiSubmitting}
                aiRecovering={aiRecovering}
                currentDraft={currentDraft}
                editable={Boolean(editable)}
                executable={Boolean(executable)}
                canCreateDraft={!draftVersionSelected && !aiBlockingMutations}
                busy={busy}
                hasCompletedItems={items.some((item) => item.status === "COMPLETED")}
                evaluation={evaluation}
                onGenerateAi={() => void handleGenerateAiDraft()}
                onOpenBudget={openBudgetEditor}
                onCreateDraft={() => void createDraft()}
                onOpenHistory={() => void openPlanProgressHistory()}
                onOpenPomodoro={() => setPomodoro({ open: true })}
                onOpenQuiz={() => setQuizModalOpen(true)}
                aiUnavailableReason={aiGenerationUnavailableReason}
              />
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
              <span>Tiến độ thực tế</span>
              <span className="text-indigo-700 font-black">{completion}%</span>
            </div>
            <ProgressBar value={completion} />
          </div>

          {aiGenerationUnavailableReason && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <p>{aiGenerationUnavailableReason}</p>
            </div>
          )}
        </div>
      </Card>

      {/* AC3: Task-First Layout */}
      <div className="space-y-4">
        {/* Main Task Area (Order 1: displayed first on mobile & desktop) */}
        <div className="space-y-4">
          {/* AC4: Clear state banner & explanations */}
          {draftVersionSelected && (
            <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900">
              <Info className="size-4 shrink-0 text-indigo-600" />
              <span>
                <strong>Chế độ chỉnh sửa (DRAFT):</strong> Thêm/sửa nhiệm vụ và chỉnh quỹ thời gian.
                {items.length === 0
                  ? " Cần thêm ít nhất 1 nhiệm vụ để có thể kích hoạt."
                  : " Nhấn 'Kích hoạt kế hoạch' khi sẵn sàng bắt đầu học."}
              </span>
            </div>
          )}

          {version?.status === "SUPERSEDED" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Bản lưu trữ lịch sử (SUPERSEDED):</strong> Đang ở chế độ chỉ đọc.
                </span>
              </div>
              {activeVersion && (
                <button
                  type="button"
                  onClick={() => {
                    setStepTargetId(null);
                    setSelectedId(activeVersion.id);
                  }}
                  className="font-bold text-indigo-700 underline hover:text-indigo-900 text-left"
                >
                  Chuyển sang bản ACTIVE
                </button>
              )}
            </div>
          )}

          {plan.status === "COMPLETED" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Hoàn thành:</strong> Bạn đã hoàn tất kế hoạch học tập của ngày hôm nay!
              </span>
            </div>
          )}

          {/* AI Decision Alert */}
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

          {/* AI Explanation Alert */}
          {version?.aiExplanation && (
            <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/50 p-4 text-indigo-900 ring-1 ring-inset ring-indigo-500/20">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-indigo-600" />
              <div>
                <h4 className="font-bold text-indigo-800">✨ AI đề xuất</h4>
                <p className="mt-1 text-sm leading-relaxed">{version.aiExplanation}</p>
              </div>
            </div>
          )}

          {/* AC3: Hero Focus Task Card (Nhiệm vụ tiếp theo cần làm) */}
          {executable && nextTask && (
            <FocusTaskCard
              item={nextTask}
              onPomodoro={() => setPomodoro({ open: true, taskId: nextTask.id })}
              onProgress={() => requestOutcome(nextTask)}
              onOpenSteps={() => setStepTargetId(nextTask.id)}
            />
          )}

          {/* AI Execution Status (only visible when executing, recovering, or error) */}
          <DailyPlanAiExecutionStatus
            execution={aiExecution}
            recovering={aiRecovering}
            pollingError={aiPollingError}
            onRefresh={refreshAiStatus}
            onDismiss={dismissAiFailure}
            onRetry={
              aiExecution?.operation === "REGENERATE"
                ? () => void regenerateWithAi()
                : () => void generateWithAi()
            }
            isRetrying={aiSubmitting}
          />

          {/* Task execution/editor header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                {version?.status === "ACTIVE" ? "Bảng thực hiện hôm nay" : "Danh sách nhiệm vụ"} (
                {items.length})
              </h3>
              <p className="text-xs text-slate-500">
                {version?.status === "ACTIVE"
                  ? "Kéo thẻ để bắt đầu hoặc ghi nhận kết quả; các nút trên thẻ hỗ trợ bàn phím và thiết bị cảm ứng."
                  : `${items.filter((i) => i.status === "COMPLETED").length}/${items.length} nhiệm vụ hoàn thành`}
              </p>
            </div>
            {editable && (
              <Button size="sm" variant="secondary" onClick={() => void openAddTask()}>
                <Plus className="size-3.5" />
                Thêm nhiệm vụ
              </Button>
            )}
          </div>

          {/* ACTIVE versions use Kanban; DRAFT and historical versions keep the established list. */}
          {items.length === 0 ? (
            <Card className="grid min-h-72 place-items-center border-dashed p-8 text-center">
              <div>
                <ListChecks className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-4 font-black">Chưa có nhiệm vụ</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Thêm task thủ công vào phiên bản DRAFT này hoặc yêu cầu AI tạo nhiệm vụ.
                </p>
                {editable && (
                  <Button className="mt-5" onClick={() => void openAddTask()}>
                    <Plus className="size-4" />
                    Thêm nhiệm vụ
                  </Button>
                )}
              </div>
            </Card>
          ) : version?.status === "ACTIVE" ? (
            <DailyPlanKanbanBoard
              items={items}
              executable={Boolean(executable)}
              pendingItemId={startingTaskId}
              onStart={(item) => void startTask(item)}
              onRequestOutcome={requestOutcome}
              onOpenSteps={(item) => setStepTargetId(item.id)}
              onHistory={(item) => void openProgressHistory(item)}
              onPomodoro={(item) => setPomodoro({ open: true, taskId: item.id })}
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <DailyPlanTaskCard
                  key={item.id}
                  item={item}
                  editable={Boolean(editable)}
                  executable={Boolean(executable)}
                  onEdit={() => void openEditTask(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onProgress={() => requestOutcome(item)}
                  onHistory={() => void openProgressHistory(item)}
                  onPomodoro={() => setPomodoro({ open: true, taskId: item.id })}
                  onOpenSteps={() => setStepTargetId(item.id)}
                />
              ))}
            </div>
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
      {version && budgetOpen ? (
        <Modal
          open
          onClose={() => setBudgetOpen(false)}
          title="Chỉnh quỹ thời gian"
          description="Giá trị này chỉ thuộc phiên bản DRAFT đang chọn. AI sẽ dùng đúng snapshot này cho lần sinh tiếp theo."
          closeDisabled={busy}
          confirmClose={budgetMinutes !== version.availableMinutes}
        >
          <div className="space-y-5">
            <StudyDurationField
              value={budgetMinutes}
              onChange={setBudgetMinutes}
              legend="Thời gian có thể học trong ngày"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setBudgetOpen(false)}>
                Hủy
              </Button>
              <Button
                type="button"
                loading={busy}
                disabled={!isValidStudyDuration(budgetMinutes)}
                onClick={() => void saveBudget()}
              >
                Lưu quỹ thời gian
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
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
          onRecordOutcome={(item, step) => {
            setStepTargetId(null);
            setCompletionStepTarget(step);
            setProgressInitialStatus(null);
            setProgressTarget(item);
          }}
        />
      )}
      {progressTarget && (
        <ProgressModal
          open
          item={progressTarget}
          initialStatus={progressInitialStatus ?? undefined}
          pendingRequiredStepCompletion={Boolean(
            completionStepTarget?.required &&
            !completionStepTarget.completed &&
            incompleteRequiredStepCount(progressTarget) === 1,
          )}
          title={completionStepTarget ? "Hoàn thành bước và nhiệm vụ" : undefined}
          onClose={() => {
            setProgressTarget(null);
            setCompletionStepTarget(null);
            setProgressInitialStatus(null);
          }}
          onOpenSteps={() => {
            setProgressTarget(null);
            setCompletionStepTarget(null);
            setProgressInitialStatus(null);
            setStepTargetId(progressTarget.id);
          }}
          onSave={async (values, idempotencyKey) => {
            if (completionStepTarget && version) {
              try {
                await dailyPlanApi.completeTaskStepAndRecordProgress(
                  id,
                  version.id,
                  progressTarget.id,
                  completionStepTarget.id,
                  completionStepTarget.stateVersion,
                  values,
                  idempotencyKey,
                );
                show("Đã hoàn thành bước cuối và ghi kết quả nhiệm vụ.");
                await load();
                setProgressTarget(null);
                setCompletionStepTarget(null);
                setProgressInitialStatus(null);
                return true;
              } catch (error) {
                show(getErrorMessage(error), "error");
                await load();
                return false;
              }
            }

            const saved = await recordProgress(progressTarget, values, idempotencyKey);
            if (saved) {
              setProgressTarget(null);
              setCompletionStepTarget(null);
              setProgressInitialStatus(null);
            }
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
  initialStatus: requestedInitialStatus,
  pendingRequiredStepCompletion = false,
  title = "Ghi nhận kết quả",
  onClose,
  onOpenSteps,
  onSave,
}: {
  open: boolean;
  item: DailyPlanItem;
  initialEntry?: ProgressEntry;
  initialStatus?: ProgressEntryStatus;
  pendingRequiredStepCompletion?: boolean;
  title?: string;
  onClose: () => void;
  onOpenSteps?: () => void;
  onSave: (values: ProgressInput, idempotencyKey: string) => Promise<boolean>;
}) {
  const remainingRequiredSteps = incompleteRequiredStepCount(item);
  const completionBlocked =
    remainingRequiredSteps > 0 &&
    !pendingRequiredStepCompletion &&
    initialEntry?.status !== "COMPLETED";
  const initialStatus: ProgressEntryStatus =
    initialEntry?.status ??
    requestedInitialStatus ??
    (item.status === "PARTIALLY_COMPLETED" || item.status === "SKIPPED"
      ? item.status
      : completionBlocked
        ? "PARTIALLY_COMPLETED"
        : "COMPLETED");
  const [status, setStatus] = useState<ProgressEntryStatus>(initialStatus);
  const initialPercentage =
    initialEntry?.completionPercentage ??
    item.completionPercentage ??
    (initialStatus === "COMPLETED" ? 100 : initialStatus === "SKIPPED" ? 0 : 50);
  const [completionPercentage, setCompletionPercentage] = useState(initialPercentage);
  const [minutes, setMinutes] = useState(initialEntry?.actualMinutes ?? item.plannedMinutes ?? 30);
  const [result, setResult] = useState(initialEntry?.actualResult ?? "");
  const [difficulty, setDifficulty] = useState(initialEntry?.difficulty ?? 3);
  const [understanding, setUnderstanding] = useState(initialEntry?.understandingRating ?? 3);
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "COMPLETED" && completionBlocked) return;
    setLoading(true);
    try {
      await onSave(
        {
          status,
          completionPercentage:
            status === "COMPLETED" ? 100 : status === "SKIPPED" ? 0 : completionPercentage,
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
        (status === "PARTIALLY_COMPLETED" && completionPercentage !== initialPercentage) ||
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
                disabled={option.value === "COMPLETED" && completionBlocked}
                onClick={() => setStatus(option.value)}
                title={
                  option.value === "COMPLETED" && completionBlocked
                    ? "Hoàn thành mọi bước bắt buộc trước"
                    : undefined
                }
                className={`focus-ring rounded-xl border px-2 py-3 text-xs font-bold disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${status === option.value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        {completionBlocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              Còn <strong>{remainingRequiredSteps}</strong> bước bắt buộc chưa hoàn thành. Bạn vẫn
              có thể ghi nhận một phần hoặc bỏ qua nhiệm vụ.
            </p>
            {onOpenSteps && (
              <Button type="button" size="sm" variant="secondary" onClick={onOpenSteps}>
                <ListChecks className="size-4" />
                Mở checklist
              </Button>
            )}
          </div>
        )}
        {status === "PARTIALLY_COMPLETED" && (
          <Field label="Mức hoàn thành thực tế (%)">
            <Input
              type="number"
              min={1}
              max={99}
              value={completionPercentage}
              onChange={(event) => setCompletionPercentage(Number(event.target.value))}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Nhập chính xác từ 1 đến 99%. Thời gian học thực tế được ghi riêng bên dưới.
            </p>
          </Field>
        )}
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
          <Button
            type="submit"
            loading={loading}
            disabled={
              (status === "COMPLETED" && completionBlocked) ||
              (status === "PARTIALLY_COMPLETED" &&
                (completionPercentage < 1 || completionPercentage > 99))
            }
          >
            Lưu tiến độ
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FocusTaskCard({
  item,
  onPomodoro,
  onProgress,
  onOpenSteps,
}: {
  item: DailyPlanItem;
  onPomodoro: () => void;
  onProgress: () => void;
  onOpenSteps: () => void;
}) {
  const steps = item.steps ?? [];
  const stepProgress = item.stepProgress;
  const isStarted = item.status === "IN_PROGRESS";

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-5 shadow-xs transition hover:border-indigo-500/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Target className="size-3.5" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
            Nhiệm vụ tiếp theo cần làm
          </span>
        </div>
        <Badge tone={isStarted ? "indigo" : "slate"}>
          {isStarted ? "Đang làm dở" : "Ưu tiên kế tiếp"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-black text-slate-900 sm:text-lg">{item.title}</h4>
          {item.description && (
            <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{item.description}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5 text-slate-400" />
              {item.plannedMinutes ?? 30} phút
            </span>
            {(item.studyUnit || item.learningUnitTitle) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700">
                Đơn vị: {item.studyUnit?.title ?? item.learningUnitTitle}
              </span>
            )}
            {steps.length > 0 && (
              <span className="text-indigo-600 font-bold">
                {stepProgress?.completedRequiredCount ?? 0}/{stepProgress?.requiredCount ?? 0} bước
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="primary"
            onClick={onPomodoro}
            className="shadow-xs"
            title="Bắt đầu học với Pomodoro"
          >
            <Timer className="size-3.5" />
            {isStarted ? "Tiếp tục Pomodoro" : "Bắt đầu học"}
          </Button>
          <Button size="sm" variant="success" onClick={onProgress} title="Ghi nhận kết quả thực tế">
            <CheckCircle2 className="size-3.5" />
            Ghi nhận kết quả
          </Button>
          {steps.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenSteps}
              title="Xem các bước checklist"
            >
              <ListChecks className="size-3.5" />
              Checklist
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MoreActionsMenu({
  canGenerateAi,
  aiActive,
  aiSubmitting,
  aiRecovering,
  currentDraft,
  editable,
  executable,
  canCreateDraft,
  busy,
  hasCompletedItems,
  evaluation,
  onGenerateAi,
  onOpenBudget,
  onCreateDraft,
  onOpenHistory,
  onOpenPomodoro,
  onOpenQuiz,
  aiUnavailableReason,
}: {
  canGenerateAi: boolean;
  aiActive: boolean;
  aiSubmitting: boolean;
  aiRecovering: boolean;
  currentDraft: DailyPlanVersion | null;
  editable: boolean;
  executable: boolean;
  canCreateDraft: boolean;
  busy: boolean;
  hasCompletedItems: boolean;
  evaluation: DailyEvaluation | null;
  onGenerateAi: () => void;
  onOpenBudget: () => void;
  onCreateDraft: () => void;
  onOpenHistory: () => void;
  onOpenPomodoro: () => void;
  onOpenQuiz: () => void;
  aiUnavailableReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("mousedown", onMouseDown);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition shadow-xs"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tùy chọn khác"
      >
        <MoreVertical className="size-4" />
        <span className="hidden sm:inline">Tùy chọn khác</span>
        <ChevronDown
          className={`size-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-up"
        >
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Hành động bổ sung
          </div>

          {/* AI Generation */}
          <button
            type="button"
            role="menuitem"
            disabled={!canGenerateAi}
            onClick={() => {
              setOpen(false);
              onGenerateAi();
            }}
            title={aiUnavailableReason ?? undefined}
            className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition"
          >
            <Sparkles className="size-4 text-indigo-600" />
            <span className="flex-1">
              {aiActive
                ? "AI đang xử lý..."
                : aiSubmitting || aiRecovering
                  ? "Đang gửi yêu cầu..."
                  : currentDraft
                    ? "Sinh lại bằng AI"
                    : "Sinh kế hoạch bằng AI"}
            </span>
          </button>

          {/* Edit budget if DRAFT */}
          {editable && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenBudget();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <Timer className="size-4 text-slate-500" />
              <span>Chỉnh quỹ thời gian</span>
            </button>
          )}

          {/* Create new DRAFT version */}
          {canCreateDraft && (
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                onCreateDraft();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
            >
              <CopyPlus className="size-4 text-slate-500" />
              <span>Tạo bản chỉnh sửa (DRAFT)</span>
            </button>
          )}

          {/* Pomodoro */}
          {executable && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenPomodoro();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <Timer className="size-4 text-rose-500" />
              <span>Đồng hồ Pomodoro</span>
            </button>
          )}

          {/* Progress History of plan */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenHistory();
            }}
            className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <History className="size-4 text-slate-500" />
            <span>Lịch sử tiến độ của ngày</span>
          </button>

          {/* Quiz */}
          {hasCompletedItems && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenQuiz();
              }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 transition"
            >
              <Sparkles className="size-4 text-amber-500" />
              <span>
                {evaluation?.quizScore != null
                  ? `Xem lại Quiz (${evaluation.quizScore}%)`
                  : "Làm Micro-Quiz cuối ngày"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
