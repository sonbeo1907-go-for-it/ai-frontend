"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { aiExecutionPoller } from "@/lib/ai-execution-poller";
import { useAiExecutionPolling } from "@/lib/use-ai-execution-polling";
import type { AiExecution } from "@/types/api";
import { getLatestDailyQuizExecution, queueDailyQuizGeneration } from "./evaluation-api";

function isActive(execution: AiExecution | null | undefined) {
  if (!execution) return false;
  return execution.status === "QUEUED" || execution.status === "RUNNING";
}

function isDailyQuizExecution(execution: AiExecution) {
  return execution.purpose === "QUIZ_GENERATION" && execution.targetType === "DAILY_PLAN_VERSION";
}

export function useDailyQuizAiExecution(
  dailyPlanId: string,
  enabled: boolean,
  onSucceeded: (quizId: string) => Promise<void> | void,
) {
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const handledExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const { execution: polledExecution, error: polledError } = useAiExecutionPolling(
    enabled ? activeExecutionId : null,
  );

  const isQuiz = polledExecution ? isDailyQuizExecution(polledExecution) : true;
  const execution = isQuiz ? polledExecution : null;

  const pollingError = !isQuiz
    ? "Tiến trình AI không phải là tiến trình tạo Micro-Quiz."
    : polledError
      ? getErrorMessage(polledError)
      : recoveryError;

  const acceptExecution = useCallback((nextExecution: AiExecution) => {
    if (!isDailyQuizExecution(nextExecution)) {
      throw new Error("Tiến trình AI không phải là tiến trình tạo Micro-Quiz.");
    }
    aiExecutionPoller.seedExecution(nextExecution);
    setActiveExecutionId(nextExecution.id);
    setRecoveryError("");
  }, []);

  useEffect(() => {
    if (!enabled || !dailyPlanId) return;
    let cancelled = false;

    async function recover() {
      setRecovering(true);
      try {
        const latest = await getLatestDailyQuizExecution(dailyPlanId);
        if (!cancelled && isActive(latest)) acceptExecution(latest);
      } catch (error) {
        if (!cancelled && !(error instanceof ApiClientError && error.details.status === 404)) {
          setRecoveryError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }

    void recover();
    return () => {
      cancelled = true;
    };
  }, [acceptExecution, dailyPlanId, enabled]);

  useEffect(() => {
    if (!execution || isActive(execution)) return;
    if (handledExecutionsRef.current.has(execution.id)) return;
    handledExecutionsRef.current.add(execution.id);

    if (execution.status === "FAILED") return;
    if (!execution.resultId || execution.resultType !== "QUIZ") {
      window.setTimeout(() => {
        setRecoveryError("AI đã hoàn tất nhưng không trả về Micro-Quiz hợp lệ.");
      }, 0);
      return;
    }
    void Promise.resolve(onSucceededRef.current(execution.resultId))
      .then(() => setActiveExecutionId(null))
      .catch((error) => {
        setRecoveryError(getErrorMessage(error));
      });
  }, [execution]);

  const generate = useCallback(async () => {
    setSubmitting(true);
    setRecoveryError("");
    try {
      const accepted = await queueDailyQuizGeneration(dailyPlanId, crypto.randomUUID());
      acceptExecution(accepted);
      return accepted;
    } finally {
      setSubmitting(false);
    }
  }, [acceptExecution, dailyPlanId]);

  const dismiss = useCallback(() => {
    setActiveExecutionId(null);
    setRecoveryError("");
  }, []);

  return {
    execution,
    recovering,
    submitting,
    pollingError,
    active: Boolean(execution && isActive(execution)),
    generate,
    dismiss,
  };
}
