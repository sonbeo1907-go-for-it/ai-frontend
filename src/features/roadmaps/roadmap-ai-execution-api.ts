import { apiRequest } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";

const STORAGE_KEY_PREFIX = "roadmap-ai-execution:";

export function queueRoadmapGeneration(
  roadmapId: string,
  materialIds: string[],
  idempotencyKey: string,
) {
  return apiRequest<AiExecution>(`/api/v1/roadmaps/${roadmapId}/generate-ai`, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ materialIds }),
  });
}

export function queueRoadmapRegeneration(
  roadmapId: string,
  adjustmentPrompt: string,
  idempotencyKey: string,
) {
  return apiRequest<AiExecution>(`/api/v1/roadmaps/${roadmapId}/regenerate-ai`, {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ adjustmentPrompt }),
  });
}

export function getAiExecution(executionId: string) {
  return apiRequest<AiExecution>(`/api/v1/ai-executions/${executionId}`);
}

export function getLatestRoadmapAiExecution(roadmapId: string) {
  return apiRequest<AiExecution>(`/api/v1/roadmaps/${roadmapId}/ai-executions/current`);
}

export function isActiveAiExecution(execution: AiExecution) {
  return execution.status === "QUEUED" || execution.status === "RUNNING";
}

export function belongsToRoadmap(execution: AiExecution, roadmapId: string) {
  return (
    execution.purpose === "ROADMAP_GENERATION" &&
    execution.targetType === "ROADMAP" &&
    execution.targetId === roadmapId
  );
}

export function rememberRoadmapAiExecution(roadmapId: string, executionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(roadmapId), executionId);
  } catch {
    // Storage is only a reload convenience. Polling still works in this mounted page.
  }
}

export function readRememberedRoadmapAiExecution(roadmapId: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(storageKey(roadmapId));
  } catch {
    return null;
  }
}

export function clearRememberedRoadmapAiExecution(roadmapId: string, expectedExecutionId?: string) {
  if (typeof window === "undefined") return;

  try {
    const key = storageKey(roadmapId);
    if (expectedExecutionId && window.sessionStorage.getItem(key) !== expectedExecutionId) {
      return;
    }
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function storageKey(roadmapId: string) {
  return `${STORAGE_KEY_PREFIX}${roadmapId}`;
}
