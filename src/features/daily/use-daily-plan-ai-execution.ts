"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { aiExecutionPoller } from "@/lib/ai-execution-poller";
import { useAiExecutionPolling } from "@/lib/use-ai-execution-polling";
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
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const submissionIntentRef = useRef<SubmissionIntent | null>(null);
  const handledExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const {
    execution: polledExecution,
    error: polledError,
    refreshStatus: refreshPolledStatus,
  } = useAiExecutionPolling(activeExecutionId);

  const belongs = polledExecution ? belongsToDailyPlan(polledExecution, dailyPlanId) : true;
  const execution = belongs ? polledExecution : null;

  const pollingError = !belongs
    ? "Tiến trình AI không thuộc kế hoạch ngày này."
    : polledError
      ? getErrorMessage(polledError)
      : recoveryError;

  const acceptExecution = useCallback(
    (nextExecution: AiExecution) => {
      if (!belongsToDailyPlan(nextExecution, dailyPlanId)) {
        throw new Error("Backend trả về tiến trình AI của một kế hoạch ngày khác.");
      }
      rememberDailyPlanAiExecution(dailyPlanId, nextExecution.id);
      aiExecutionPoller.seedExecution(nextExecution);
      setActiveExecutionId(nextExecution.id);
      setRecoveryError("");
    },
    [dailyPlanId],
  );

  // AC6: Reload recovery from Backend
  useEffect(() => {
    let cancelled = false;

    async function recover() {
      setRecovering(true);
      const rememberedId = readRememberedDailyPlanAiExecution(dailyPlanId);
      try {
        let recovered: AiExecution | null = null;
        if (rememberedId) {
          try {
            recovered = await getAiExecution(rememberedId);
          } catch (error) {
            if (error instanceof ApiClientError && error.details.status === 404) {
              clearRememberedDailyPlanAiExecution(dailyPlanId, rememberedId);
              try {
                recovered = await getLatestDailyPlanAiExecution(dailyPlanId);
              } catch (targetError) {
                if (targetError instanceof ApiClientError && targetError.details.status === 404) {
                  setRecoveryError("Không thể khôi phục tiến trình.");
                } else {
                  throw targetError;
                }
              }
            } else {
              throw error;
            }
          }
        } else {
          try {
            recovered = await getLatestDailyPlanAiExecution(dailyPlanId);
          } catch (targetError) {
            if (!(targetError instanceof ApiClientError && targetError.details.status === 404)) {
              throw targetError;
            }
          }
        }

        if (cancelled) return;
        if (recovered) {
          if (!belongsToDailyPlan(recovered, dailyPlanId)) {
            clearRememberedDailyPlanAiExecution(dailyPlanId, rememberedId ?? undefined);
            setRecoveryError("Tiến trình AI không thuộc kế hoạch ngày này.");
          } else if (rememberedId || isActiveAiExecution(recovered)) {
            acceptExecution(recovered);
          }
        }
      } catch (error) {
        if (cancelled) return;
        setRecoveryError(getErrorMessage(error));
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }

    void recover();
    return () => {
      cancelled = true;
    };
  }, [acceptExecution, dailyPlanId, refreshToken]);

  useEffect(() => {
    if (!execution || isActiveAiExecution(execution)) return;
    if (handledExecutionsRef.current.has(execution.id)) return;

    handledExecutionsRef.current.add(execution.id);
    clearRememberedDailyPlanAiExecution(dailyPlanId, execution.id);
    submissionIntentRef.current = null;

    if (execution.status === "FAILED") return;
    if (!execution.resultId || execution.resultType !== "DAILY_PLAN_VERSION") {
      window.setTimeout(
        () => setRecoveryError("AI đã hoàn tất nhưng không trả về phiên bản kế hoạch ngày."),
        0,
      );
      return;
    }

    void Promise.resolve(onSucceededRef.current(execution.resultId, execution))
      .then(() => setActiveExecutionId(null))
      .catch((error) => setRecoveryError(getErrorMessage(error)));
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
      setRecoveryError("");
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
    if (activeExecutionId) {
      clearRememberedDailyPlanAiExecution(dailyPlanId, activeExecutionId);
      setActiveExecutionId(null);
    }
    setRecoveryError("");
  }, [activeExecutionId, dailyPlanId]);

  return {
    execution,
    recovering,
    submitting,
    pollingError,
    active: Boolean(execution && isActiveAiExecution(execution)),
    generate: () => submit("GENERATE"),
    regenerate: () => submit("REGENERATE"),
    refreshStatus: () => {
      setRecoveryError("");
      if (activeExecutionId) {
        refreshPolledStatus();
        return;
      }
      setRefreshToken((current) => current + 1);
    },
    dismissFailure,
  };
}
