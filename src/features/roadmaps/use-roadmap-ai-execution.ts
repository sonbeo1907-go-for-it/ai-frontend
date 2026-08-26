"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
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

const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_INTERVAL_MS = 30_000;

type SuccessfulExecutionHandler = (
  resultId: string,
  execution: AiExecution,
) => Promise<void> | void;

type SubmissionIntent = {
  fingerprint: string;
  idempotencyKey: string;
};

export function useRoadmapAiExecution(roadmapId: string, onSucceeded: SuccessfulExecutionHandler) {
  const [execution, setExecution] = useState<AiExecution | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState(0);
  const [pollingRefreshToken, setPollingRefreshToken] = useState(0);
  const submissionIntentRef = useRef<SubmissionIntent | null>(null);
  const handledTerminalExecutionsRef = useRef(new Set<string>());
  const onSucceededRef = useRef(onSucceeded);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  const acceptExecution = useCallback(
    (nextExecution: AiExecution) => {
      if (!belongsToRoadmap(nextExecution, roadmapId)) {
        throw new Error("The backend returned an AI execution for a different Roadmap.");
      }
      rememberRoadmapAiExecution(roadmapId, nextExecution.id);
      setExecution(nextExecution);
      setPollingError("");
    },
    [roadmapId],
  );

  useEffect(() => {
    let cancelled = false;

    async function recoverExecution() {
      setRecovering(true);
      const rememberedExecutionId = readRememberedRoadmapAiExecution(roadmapId);

      try {
        const recoveredExecution = rememberedExecutionId
          ? await getAiExecution(rememberedExecutionId)
          : await getLatestRoadmapAiExecution(roadmapId);

        if (cancelled) return;
        if (!belongsToRoadmap(recoveredExecution, roadmapId)) {
          clearRememberedRoadmapAiExecution(roadmapId, rememberedExecutionId ?? undefined);
          setPollingError("Tiến trình AI không thuộc lộ trình này.");
        } else if (rememberedExecutionId || isActiveAiExecution(recoveredExecution)) {
          acceptExecution(recoveredExecution);
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof ApiClientError && error.details.status === 404) {
          clearRememberedRoadmapAiExecution(roadmapId, rememberedExecutionId ?? undefined);
        } else {
          setPollingError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }

    void recoverExecution();
    return () => {
      cancelled = true;
    };
  }, [acceptExecution, recoveryRefreshToken, roadmapId]);

  const activeExecutionId = execution && isActiveAiExecution(execution) ? execution.id : null;

  useEffect(() => {
    if (!activeExecutionId) return;

    const executionId = activeExecutionId;
    let cancelled = false;
    let timeoutId: number | undefined;
    let consecutiveFailures = 0;
    let requestInFlight = false;

    function clearScheduledPoll() {
      if (timeoutId === undefined) return;
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    function scheduleNextPoll(delayMs: number) {
      clearScheduledPoll();
      if (cancelled || document.visibilityState === "hidden") return;
      timeoutId = window.setTimeout(() => void poll(), delayMs);
    }

    async function poll() {
      if (cancelled || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;

      try {
        const nextExecution = await getAiExecution(executionId);
        if (cancelled) return;

        if (!belongsToRoadmap(nextExecution, roadmapId)) {
          clearRememberedRoadmapAiExecution(roadmapId, executionId);
          setExecution(null);
          setPollingError("Tiến trình AI không thuộc lộ trình này.");
          return;
        }

        setExecution(nextExecution);
        setPollingError("");
        consecutiveFailures = 0;
        if (isActiveAiExecution(nextExecution)) {
          scheduleNextPoll(POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;

        consecutiveFailures += 1;
        setPollingError(getErrorMessage(error));
        const retryDelay = Math.min(
          POLL_INTERVAL_MS * 2 ** (consecutiveFailures - 1),
          MAX_POLL_INTERVAL_MS,
        );
        scheduleNextPoll(retryDelay);
      } finally {
        requestInFlight = false;
      }
    }

    function handleVisibilityChange() {
      const hidden = document.visibilityState === "hidden";

      if (hidden) {
        clearScheduledPoll();
        return;
      }

      consecutiveFailures = 0;
      void poll();
    }

    const initiallyHidden = document.visibilityState === "hidden";
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!initiallyHidden) {
      scheduleNextPoll(pollingRefreshToken > 0 ? 0 : POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      clearScheduledPoll();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeExecutionId, pollingRefreshToken, roadmapId]);

  useEffect(() => {
    if (!execution || isActiveAiExecution(execution)) return;
    if (handledTerminalExecutionsRef.current.has(execution.id)) return;

    handledTerminalExecutionsRef.current.add(execution.id);
    clearRememberedRoadmapAiExecution(roadmapId, execution.id);
    submissionIntentRef.current = null;

    if (execution.status === "FAILED") return;
    if (!execution.resultId) {
      window.setTimeout(
        () => setPollingError("AI đã hoàn tất nhưng không trả về phiên bản lộ trình."),
        0,
      );
      return;
    }

    void Promise.resolve(onSucceededRef.current(execution.resultId, execution))
      .then(() => setExecution(null))
      .catch((error) => setPollingError(getErrorMessage(error)));
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
      setPollingError("");

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
    if (execution) clearRememberedRoadmapAiExecution(roadmapId, execution.id);
    setExecution(null);
    setPollingError("");
  }, [execution, roadmapId]);

  const refreshStatus = useCallback(() => {
    setPollingError("");
    if (execution && isActiveAiExecution(execution)) {
      setPollingRefreshToken((current) => current + 1);
      return;
    }
    setRecoveryRefreshToken((current) => current + 1);
  }, [execution]);

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
