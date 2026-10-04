"use client";

import { useCallback, useSyncExternalStore } from "react";
import { aiExecutionPoller, type PollerSnapshot } from "@/lib/ai-execution-poller";
import type { AiExecution } from "@/types/api";

export interface UseAiExecutionPollingResult {
  execution: AiExecution | null;
  error: Error | null;
  isPolling: boolean;
  refreshStatus: () => void;
}

export function useAiExecutionPolling(
  executionId: string | null | undefined,
  initialExecution?: AiExecution | null,
): UseAiExecutionPollingResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return aiExecutionPoller.subscribe(executionId, onStoreChange, initialExecution);
    },
    [executionId, initialExecution],
  );

  const getSnapshot = useCallback((): PollerSnapshot => {
    return aiExecutionPoller.getSnapshot(executionId);
  }, [executionId]);

  const getServerSnapshot = useCallback((): PollerSnapshot => {
    return aiExecutionPoller.getServerSnapshot();
  }, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refreshStatus = useCallback(() => {
    if (executionId) {
      aiExecutionPoller.refresh(executionId);
    }
  }, [executionId]);

  return {
    execution: snapshot.execution,
    error: snapshot.error,
    isPolling: snapshot.isPolling,
    refreshStatus,
  };
}
