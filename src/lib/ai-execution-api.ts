import { apiRequest } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";

export function getAiExecution(
  executionId: string,
  options?: { signal?: AbortSignal },
): Promise<AiExecution> {
  return apiRequest<AiExecution>(`/api/v1/ai-executions/${executionId}`, {
    signal: options?.signal,
  });
}

export function isActiveAiExecution(execution: AiExecution | null | undefined): boolean {
  if (!execution) return false;
  return execution.status === "QUEUED" || execution.status === "RUNNING";
}

export function isTerminalAiExecution(execution: AiExecution | null | undefined): boolean {
  if (!execution) return false;
  return (
    execution.status === "SUCCEEDED" ||
    execution.status === "FAILED" ||
    execution.status === "TIMEOUT"
  );
}
