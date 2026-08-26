"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";
import {
  belongsToDailyPlan,
  clearRememberedDailyPlanAiExecution,
  getAiExecution,
  getLatestDailyPlanAiExecution,
  isActiveAiExecution,
  queueDailyPlanGeneration,
  queueDailyPlanRegeneration,
  readRememberedDailyPlanAiExecution,
  rememberDailyPlanAiExecution,
} from "./daily-plan-ai-execution-api";

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_INTERVAL_MS = 30_000;

type SuccessfulExecutionHandler = (
  resultId: string,
  execution: AiExecution,
) => Promise<void> | void;

type SubmissionIntent = {
  operation: "GENERATE" | "REGENERATE";
  idempotencyKey: string;
};

export function useDailyPlanAiExecution(
  dailyPlanId: string,
  onSucceeded: SuccessfulExecutionHandler,
) {
  const [execution, setExecution] = useState<AiExecution | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const submissionIntentRef = useRef<SubmissionIntent | null>(null);
  const handledExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const acceptExecution = useCallback(
    (nextExecution: AiExecution) => {
      if (!belongsToDailyPlan(nextExecution, dailyPlanId)) {
        throw new Error("Backend trả về tiến trình AI của một kế hoạch ngày khác.");
      }
      rememberDailyPlanAiExecution(dailyPlanId, nextExecution.id);
      setExecution(nextExecution);
      setPollingError("");
    },
    [dailyPlanId],
  );

  useEffect(() => {
    let cancelled = false;

    async function recover() {
      setRecovering(true);
      const rememberedId = readRememberedDailyPlanAiExecution(dailyPlanId);
      try {
        const recovered = rememberedId
          ? await getAiExecution(rememberedId)
          : await getLatestDailyPlanAiExecution(dailyPlanId);
        if (cancelled) return;

        if (!belongsToDailyPlan(recovered, dailyPlanId)) {
          clearRememberedDailyPlanAiExecution(dailyPlanId, rememberedId ?? undefined);
          setPollingError("Tiến trình AI không thuộc kế hoạch ngày này.");
        } else if (rememberedId || isActiveAiExecution(recovered)) {
          acceptExecution(recovered);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.details.status === 404) {
          clearRememberedDailyPlanAiExecution(dailyPlanId, rememberedId ?? undefined);
        } else {
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
  }, [acceptExecution, dailyPlanId, refreshToken]);

  const activeExecutionId = execution && isActiveAiExecution(execution) ? execution.id : null;

  useEffect(() => {
    if (!activeExecutionId) return;
    const executionId = activeExecutionId;

    let cancelled = false;
    let requestInFlight = false;
    let timeoutId: number | undefined;
    let consecutiveFailures = 0;

    function clearPoll() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    function schedule(delay: number) {
      clearPoll();
      if (cancelled || document.visibilityState === "hidden") return;
      timeoutId = window.setTimeout(() => void poll(), delay);
    }

    async function poll() {
      if (cancelled || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const nextExecution = await getAiExecution(executionId);
        if (cancelled) return;
        if (!belongsToDailyPlan(nextExecution, dailyPlanId)) {
          clearRememberedDailyPlanAiExecution(dailyPlanId, executionId);
          setExecution(null);
          setPollingError("Tiến trình AI không thuộc kế hoạch ngày này.");
          return;
        }
        setExecution(nextExecution);
        setPollingError("");
        consecutiveFailures = 0;
        if (isActiveAiExecution(nextExecution)) schedule(POLL_INTERVAL_MS);
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
      if (document.visibilityState === "hidden") {
        clearPoll();
      } else {
        consecutiveFailures = 0;
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule(POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearPoll();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeExecutionId, dailyPlanId]);

  useEffect(() => {
    if (!execution || isActiveAiExecution(execution)) return;
    if (handledExecutionsRef.current.has(execution.id)) return;

    handledExecutionsRef.current.add(execution.id);
    clearRememberedDailyPlanAiExecution(dailyPlanId, execution.id);
    submissionIntentRef.current = null;

    if (execution.status === "FAILED") return;
    if (!execution.resultId || execution.resultType !== "DAILY_PLAN_VERSION") {
      window.setTimeout(
        () => setPollingError("AI đã hoàn tất nhưng không trả về phiên bản kế hoạch ngày."),
        0,
      );
      return;
    }

    void Promise.resolve(onSucceededRef.current(execution.resultId, execution))
      .then(() => setExecution(null))
      .catch((error) => setPollingError(getErrorMessage(error)));
  }, [dailyPlanId, execution]);

  const submit = useCallback(
    async (operation: "GENERATE" | "REGENERATE") => {
      const previousIntent = submissionIntentRef.current;
      const idempotencyKey =
        previousIntent?.operation === operation
          ? previousIntent.idempotencyKey
          : crypto.randomUUID();
      submissionIntentRef.current = { operation, idempotencyKey };
      setSubmitting(true);
      setPollingError("");
      try {
        const accepted =
          operation === "GENERATE"
            ? await queueDailyPlanGeneration(dailyPlanId, idempotencyKey)
            : await queueDailyPlanRegeneration(dailyPlanId, idempotencyKey);
        acceptExecution(accepted);
        return accepted;
      } catch (error) {
        if (error instanceof ApiClientError) submissionIntentRef.current = null;
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [acceptExecution, dailyPlanId],
  );

  const dismissFailure = useCallback(() => {
    if (execution) {
      clearRememberedDailyPlanAiExecution(dailyPlanId, execution.id);
    }
    setExecution(null);
    setPollingError("");
  }, [dailyPlanId, execution]);

  return {
    execution,
    recovering,
    submitting,
    pollingError,
    active: Boolean(execution && isActiveAiExecution(execution)),
    generate: () => submit("GENERATE"),
    regenerate: () => submit("REGENERATE"),
    refreshStatus: () => {
      setPollingError("");
      setRefreshToken((current) => current + 1);
    },
    dismissFailure,
  };
}
