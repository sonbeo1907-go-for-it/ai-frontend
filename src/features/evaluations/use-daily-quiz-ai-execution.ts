"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";
import {
  getAiExecution,
  getLatestDailyQuizExecution,
  queueDailyQuizGeneration,
} from "./evaluation-api";

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_INTERVAL_MS = 30_000;

function isActive(execution: AiExecution) {
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
  const [execution, setExecution] = useState<AiExecution | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const handledExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const acceptExecution = useCallback((nextExecution: AiExecution) => {
    if (!isDailyQuizExecution(nextExecution)) {
      throw new Error("Tiến trình AI không phải là tiến trình tạo Micro-Quiz.");
    }
    setExecution(nextExecution);
    setPollingError("");
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
          setPollingError(getErrorMessage(error));
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

  const activeExecutionId = execution && isActive(execution) ? execution.id : null;

  useEffect(() => {
    if (!enabled || !activeExecutionId) return;
    const executionId = activeExecutionId;
    let cancelled = false;
    let requestInFlight = false;
    let timeoutId: number | undefined;
    let consecutiveFailures = 0;

    function schedule(delay: number) {
      if (cancelled || document.visibilityState === "hidden") return;
      timeoutId = window.setTimeout(() => void poll(), delay);
    }

    async function poll() {
      if (cancelled || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const nextExecution = await getAiExecution(executionId);
        if (cancelled) return;
        acceptExecution(nextExecution);
        consecutiveFailures = 0;
        if (isActive(nextExecution)) schedule(POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        consecutiveFailures += 1;
        setPollingError(getErrorMessage(error));
        schedule(Math.min(POLL_INTERVAL_MS * 2 ** (consecutiveFailures - 1), MAX_POLL_INTERVAL_MS));
      } finally {
        requestInFlight = false;
      }
    }

    function handleVisibilityChange() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
      if (document.visibilityState === "visible") void poll();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule(POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [acceptExecution, activeExecutionId, enabled]);

  useEffect(() => {
    if (!execution || isActive(execution)) return;
    if (handledExecutionsRef.current.has(execution.id)) return;
    handledExecutionsRef.current.add(execution.id);

    if (execution.status === "FAILED") return;
    if (!execution.resultId || execution.resultType !== "QUIZ") {
      window.setTimeout(() => {
        setPollingError("AI đã hoàn tất nhưng không trả về Micro-Quiz hợp lệ.");
      }, 0);
      return;
    }
    void Promise.resolve(onSucceededRef.current(execution.resultId)).catch((error) => {
      setPollingError(getErrorMessage(error));
    });
  }, [execution]);

  const generate = useCallback(async () => {
    setSubmitting(true);
    setPollingError("");
    try {
      const accepted = await queueDailyQuizGeneration(dailyPlanId, crypto.randomUUID());
      acceptExecution(accepted);
      return accepted;
    } finally {
      setSubmitting(false);
    }
  }, [acceptExecution, dailyPlanId]);

  const dismiss = useCallback(() => {
    setExecution(null);
    setPollingError("");
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
