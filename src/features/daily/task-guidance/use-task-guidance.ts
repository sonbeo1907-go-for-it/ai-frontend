"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api-client";
import type { AiExecution, TaskGuidanceOverview, TaskGuidanceRevision } from "@/types/api";
import { aiExecutionPoller } from "@/lib/ai-execution-poller";
import { useAiExecutionPolling } from "@/lib/use-ai-execution-polling";
import {
  belongsToTaskGuidance,
  clearRememberedTaskGuidanceExecution,
  isActiveTaskGuidanceExecution,
  readRememberedTaskGuidanceExecution,
  rememberTaskGuidanceExecution,
  taskGuidanceApi,
} from "./task-guidance-api";
import { getTaskGuidanceErrorMessage, isMissingTaskGuidance } from "./task-guidance-errors";

type SubmissionIntent = {
  operation: "GENERATE" | "REGENERATE";
  idempotencyKey: string;
};

type UseTaskGuidanceOptions = {
  planId: string;
  versionId: string;
  itemId: string;
  contextKey: string;
};

export function useTaskGuidance({ planId, versionId, itemId, contextKey }: UseTaskGuidanceOptions) {
  const [overview, setOverview] = useState<TaskGuidanceOverview | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<TaskGuidanceRevision | null>(null);
  const [execution, setExecution] = useState<AiExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRevision, setLoadingRevision] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pollingError, setPollingError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const submissionIntentRef = useRef<SubmissionIntent | null>(null);
  const handledExecutionsRef = useRef(new Set<string>());

  const clearRemembered = useCallback(
    (expectedExecutionId?: string) =>
      clearRememberedTaskGuidanceExecution(planId, versionId, itemId, expectedExecutionId),
    [itemId, planId, versionId],
  );

  const acceptExecution = useCallback(
    (nextExecution: AiExecution) => {
      if (!belongsToTaskGuidance(nextExecution, itemId)) {
        throw new Error("Tiến trình AI không thuộc nhiệm vụ đang xem.");
      }

      rememberTaskGuidanceExecution(planId, versionId, itemId, nextExecution.id);
      setExecution(nextExecution);
      setPollingError("");
      aiExecutionPoller.seedExecution(nextExecution);
    },
    [itemId, planId, versionId],
  );

  const refreshOverview = useCallback(
    async (page = 0, selectLatest = false) => {
      try {
        const nextOverview = await taskGuidanceApi.getOverview(planId, versionId, itemId, page, 10);
        setOverview(nextOverview);
        if (selectLatest) setSelectedRevision(nextOverview.latestRevision);
        setError("");
        return nextOverview;
      } catch (requestError) {
        if (isMissingTaskGuidance(requestError)) {
          setOverview(null);
          setSelectedRevision(null);
          setError("");
          return null;
        }
        setError(getTaskGuidanceErrorMessage(requestError));
        return null;
      }
    },
    [itemId, planId, versionId],
  );

  useEffect(() => {
    let cancelled = false;

    async function recoverExecution() {
      const rememberedId = readRememberedTaskGuidanceExecution(planId, versionId, itemId);
      if (rememberedId) {
        try {
          return {
            execution: await taskGuidanceApi.getExecution(rememberedId),
            remembered: true,
          };
        } catch (requestError) {
          if (!isMissingTaskGuidance(requestError)) throw requestError;
          clearRememberedTaskGuidanceExecution(planId, versionId, itemId, rememberedId);
        }
      }

      try {
        return {
          execution: await taskGuidanceApi.getCurrentExecution(planId, versionId, itemId),
          remembered: false,
        };
      } catch (requestError) {
        if (isMissingTaskGuidance(requestError)) return null;
        throw requestError;
      }
    }

    async function initialize() {
      setLoading(true);
      setRecovering(true);
      setError("");
      setPollingError("");

      const [overviewResult, executionResult] = await Promise.allSettled([
        taskGuidanceApi.getOverview(planId, versionId, itemId, 0, 10),
        recoverExecution(),
      ]);
      if (cancelled) return;

      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
        setSelectedRevision(overviewResult.value.latestRevision);
      } else if (isMissingTaskGuidance(overviewResult.reason)) {
        setOverview(null);
        setSelectedRevision(null);
      } else {
        setError(getTaskGuidanceErrorMessage(overviewResult.reason));
      }

      if (executionResult.status === "fulfilled" && executionResult.value) {
        const recovered = executionResult.value;
        if (!belongsToTaskGuidance(recovered.execution, itemId)) {
          clearRememberedTaskGuidanceExecution(planId, versionId, itemId, recovered.execution.id);
          setPollingError("Tiến trình AI không thuộc nhiệm vụ đang xem.");
        } else if (recovered.remembered || isActiveTaskGuidanceExecution(recovered.execution)) {
          acceptExecution(recovered.execution);
        }
      } else if (executionResult.status === "rejected") {
        setPollingError(getTaskGuidanceErrorMessage(executionResult.reason));
      }

      setLoading(false);
      setRecovering(false);
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [acceptExecution, contextKey, itemId, planId, refreshToken, versionId]);

  const activeExecutionId =
    execution && isActiveTaskGuidanceExecution(execution) ? execution.id : null;

  const {
    execution: polledExecution,
    error: polledError,
    refreshStatus: refreshPolledStatus,
  } = useAiExecutionPolling(activeExecutionId);

  const currentExecution = polledExecution ?? execution;
  const belongs = currentExecution ? belongsToTaskGuidance(currentExecution, itemId) : true;
  const effectiveExecution = belongs ? currentExecution : null;

  const effectivePollingError = !belongs
    ? "Tiến trình AI không thuộc nhiệm vụ đang xem."
    : polledError
      ? getTaskGuidanceErrorMessage(polledError)
      : pollingError;

  useEffect(() => {
    if (!effectiveExecution || isActiveTaskGuidanceExecution(effectiveExecution)) return;
    if (handledExecutionsRef.current.has(effectiveExecution.id)) return;

    if (effectiveExecution.status === "FAILED") {
      handledExecutionsRef.current.add(effectiveExecution.id);
      clearRemembered(effectiveExecution.id);
      submissionIntentRef.current = null;
      return;
    }
    if (
      !effectiveExecution.resultId ||
      effectiveExecution.resultType !== "TASK_GUIDANCE_REVISION"
    ) {
      handledExecutionsRef.current.add(effectiveExecution.id);
      clearRemembered(effectiveExecution.id);
      submissionIntentRef.current = null;
      const timeoutId = window.setTimeout(
        () => setPollingError("AI đã hoàn tất nhưng không trả về phiên bản hướng dẫn hợp lệ."),
        0,
      );
      return () => window.clearTimeout(timeoutId);
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (handledExecutionsRef.current.has(effectiveExecution.id)) return;
      handledExecutionsRef.current.add(effectiveExecution.id);
      clearRemembered(effectiveExecution.id);
      submissionIntentRef.current = null;
      setLoadingRevision(true);
      void Promise.all([
        taskGuidanceApi.getRevision(planId, versionId, itemId, effectiveExecution.resultId!),
        taskGuidanceApi.getOverview(planId, versionId, itemId, 0, 10),
      ])
        .then(([revision, nextOverview]) => {
          if (cancelled) return;
          setSelectedRevision(revision);
          setOverview(nextOverview);
          setExecution(null);
          setError("");
        })
        .catch((requestError) => {
          if (!cancelled) setError(getTaskGuidanceErrorMessage(requestError));
        })
        .finally(() => {
          if (!cancelled) setLoadingRevision(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [clearRemembered, effectiveExecution, itemId, planId, versionId]);

  const submit = useCallback(
    async (operation: "GENERATE" | "REGENERATE", adjustmentInstruction?: string) => {
      const previousIntent = submissionIntentRef.current;
      const idempotencyKey =
        previousIntent?.operation === operation
          ? previousIntent.idempotencyKey
          : crypto.randomUUID();
      submissionIntentRef.current = { operation, idempotencyKey };
      setSubmitting(true);
      setError("");
      setPollingError("");

      try {
        const accepted =
          operation === "GENERATE"
            ? await taskGuidanceApi.generate(planId, versionId, itemId, idempotencyKey)
            : await taskGuidanceApi.regenerate(
                planId,
                versionId,
                itemId,
                { adjustmentInstruction: adjustmentInstruction?.trim() || undefined },
                idempotencyKey,
              );
        acceptExecution(accepted);
        return true;
      } catch (requestError) {
        if (requestError instanceof ApiClientError) submissionIntentRef.current = null;
        setError(getTaskGuidanceErrorMessage(requestError));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [acceptExecution, itemId, planId, versionId],
  );

  const selectRevision = useCallback(
    async (revisionId: string) => {
      setLoadingRevision(true);
      setError("");
      try {
        const revision = await taskGuidanceApi.getRevision(planId, versionId, itemId, revisionId);
        setSelectedRevision(revision);
      } catch (requestError) {
        setError(getTaskGuidanceErrorMessage(requestError));
      } finally {
        setLoadingRevision(false);
      }
    },
    [itemId, planId, versionId],
  );

  const dismissFailure = useCallback(() => {
    if (execution) clearRemembered(execution.id);
    setExecution(null);
    setPollingError("");
  }, [clearRemembered, execution]);

  return {
    overview,
    selectedRevision,
    execution: effectiveExecution,
    loading,
    loadingRevision,
    recovering,
    submitting,
    error,
    pollingError: effectivePollingError,
    active: Boolean(effectiveExecution && isActiveTaskGuidanceExecution(effectiveExecution)),
    generate: () => submit("GENERATE"),
    regenerate: (adjustmentInstruction?: string) => submit("REGENERATE", adjustmentInstruction),
    selectRevision,
    loadHistoryPage: (page: number) => refreshOverview(page, false),
    refresh: () => {
      setError("");
      setPollingError("");
      if (activeExecutionId) {
        refreshPolledStatus();
        return;
      }
      setRefreshToken((current) => current + 1);
    },
    dismissFailure,
  };
}
