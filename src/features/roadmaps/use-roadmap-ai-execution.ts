"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { aiExecutionPoller } from "@/lib/ai-execution-poller";
import { useAiExecutionPolling } from "@/lib/use-ai-execution-polling";
import type { AiExecution } from "@/types/api";
import {
  belongsToRoadmap,
  clearRememberedRoadmapAiExecution,
  getAiExecution,
  getLatestRoadmapAiExecution,
  isActiveAiExecution,
  queueRoadmapGeneration,
  queueRoadmapRegeneration,
  readRememberedRoadmapAiExecution,
  rememberRoadmapAiExecution,
} from "./roadmap-ai-execution-api";

type SuccessfulExecutionHandler = (
  resultId: string,
  execution: AiExecution,
) => Promise<void> | void;

type SubmissionIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function useRoadmapAiExecution(roadmapId: string, onSucceeded: SuccessfulExecutionHandler) {
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState(0);
  const submissionIntentRef = useRef<SubmissionIntent | null>(null);
  const handledTerminalExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const {
    execution: polledExecution,
    error: polledError,
    refreshStatus: refreshPolledStatus,
  } = useAiExecutionPolling(activeExecutionId);

  const belongs = polledExecution ? belongsToRoadmap(polledExecution, roadmapId) : true;
  const execution = belongs ? polledExecution : null;

  const pollingError = !belongs
    ? "Tiến trình AI không thuộc lộ trình này."
    : polledError
      ? getErrorMessage(polledError)
      : recoveryError;

  const acceptExecution = useCallback(
    (nextExecution: AiExecution) => {
      if (!belongsToRoadmap(nextExecution, roadmapId)) {
        throw new Error("The backend returned an AI execution for a different Roadmap.");
      }
      rememberRoadmapAiExecution(roadmapId, nextExecution.id);
      aiExecutionPoller.seedExecution(nextExecution);
      setActiveExecutionId(nextExecution.id);
      setRecoveryError("");
    },
    [roadmapId],
  );

  // AC6: Reload recovery from Backend
  useEffect(() => {
    let cancelled = false;

    async function recoverExecution() {
      setRecovering(true);
      const rememberedExecutionId = readRememberedRoadmapAiExecution(roadmapId);

      try {
        let recoveredExecution: AiExecution | null = null;
        if (rememberedExecutionId) {
          try {
            recoveredExecution = await getAiExecution(rememberedExecutionId);
          } catch (error) {
            if (error instanceof ApiClientError && error.details.status === 404) {
              clearRememberedRoadmapAiExecution(roadmapId, rememberedExecutionId);
              try {
                recoveredExecution = await getLatestRoadmapAiExecution(roadmapId);
              } catch (latestError) {
                if (latestError instanceof ApiClientError && latestError.details.status === 404) {
                  setRecoveryError("Không thể khôi phục tiến trình.");
                } else {
                  throw latestError;
                }
              }
            } else {
              throw error;
            }
          }
        } else {
          try {
            recoveredExecution = await getLatestRoadmapAiExecution(roadmapId);
          } catch (latestError) {
            if (!(latestError instanceof ApiClientError && latestError.details.status === 404)) {
              throw latestError;
            }
          }
        }

        if (cancelled) return;
        if (recoveredExecution) {
          if (!belongsToRoadmap(recoveredExecution, roadmapId)) {
            clearRememberedRoadmapAiExecution(roadmapId, rememberedExecutionId ?? undefined);
            setRecoveryError("Tiến trình AI không thuộc lộ trình này.");
          } else if (rememberedExecutionId || isActiveAiExecution(recoveredExecution)) {
            acceptExecution(recoveredExecution);
          }
        }
      } catch (error) {
        if (cancelled) return;
        setRecoveryError(getErrorMessage(error));
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }

    void recoverExecution();
    return () => {
      cancelled = true;
    };
  }, [acceptExecution, recoveryRefreshToken, roadmapId]);

  useEffect(() => {
    if (!execution || isActiveAiExecution(execution)) return;
    if (handledTerminalExecutionsRef.current.has(execution.id)) return;

    handledTerminalExecutionsRef.current.add(execution.id);
    clearRememberedRoadmapAiExecution(roadmapId, execution.id);
    submissionIntentRef.current = null;

    if (execution.status === "FAILED") return;
    if (!execution.resultId) {
      window.setTimeout(
        () => setRecoveryError("AI đã hoàn tất nhưng không trả về phiên bản lộ trình."),
        0,
      );
      return;
    }

    void Promise.resolve(onSucceededRef.current(execution.resultId, execution))
      .then(() => setActiveExecutionId(null))
      .catch((error) => setRecoveryError(getErrorMessage(error)));
  }, [execution, roadmapId]);

  const submit = useCallback(
    async (fingerprint: string, run: (idempotencyKey: string) => Promise<AiExecution>) => {
      const previousIntent = submissionIntentRef.current;
      const idempotencyKey =
        previousIntent?.fingerprint === fingerprint
          ? previousIntent.idempotencyKey
          : crypto.randomUUID();

      submissionIntentRef.current = { fingerprint, idempotencyKey };
      setSubmitting(true);
      setRecoveryError("");

      try {
        const acceptedExecution = await run(idempotencyKey);
        acceptExecution(acceptedExecution);
        return acceptedExecution;
      } catch (error) {
        if (error instanceof ApiClientError) submissionIntentRef.current = null;
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [acceptExecution],
  );

  const generate = useCallback(
    (materialIds: string[]) => {
      const normalizedIds = [...materialIds].sort();
      return submit(`GENERATE:${JSON.stringify(normalizedIds)}`, (idempotencyKey) =>
        queueRoadmapGeneration(roadmapId, normalizedIds, idempotencyKey),
      );
    },
    [roadmapId, submit],
  );

  const regenerate = useCallback(
    (adjustmentPrompt: string) => {
      const normalizedPrompt = adjustmentPrompt.trim();
      return submit(`REGENERATE:${normalizedPrompt}`, (idempotencyKey) =>
        queueRoadmapRegeneration(roadmapId, normalizedPrompt, idempotencyKey),
      );
    },
    [roadmapId, submit],
  );

  const dismissFailure = useCallback(() => {
    if (activeExecutionId) {
      clearRememberedRoadmapAiExecution(roadmapId, activeExecutionId);
      setActiveExecutionId(null);
    }
    setRecoveryError("");
  }, [activeExecutionId, roadmapId]);

  const refreshStatus = useCallback(() => {
    setRecoveryError("");
    if (activeExecutionId) {
      refreshPolledStatus();
      return;
    }
    setRecoveryRefreshToken((current) => current + 1);
  }, [activeExecutionId, refreshPolledStatus]);

  return {
    execution,
    recovering,
    submitting,
    pollingError,
    active: Boolean(execution && isActiveAiExecution(execution)),
    generate,
    regenerate,
    refreshStatus,
    dismissFailure,
  };
}
