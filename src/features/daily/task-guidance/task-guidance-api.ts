import { apiRequest } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";
import { dailyPlanApi, type RegenerateTaskGuidanceInput } from "../daily-plan-api";

const STORAGE_KEY_PREFIX = "task-guidance-ai-execution:";

export const taskGuidanceApi = {
  getOverview: dailyPlanApi.getTaskGuidanceOverview,
  getRevision: dailyPlanApi.getTaskGuidanceRevision,
  generate: dailyPlanApi.generateTaskGuidance,
  regenerate: (
    planId: string,
    versionId: string,
    itemId: string,
    input: RegenerateTaskGuidanceInput,
    idempotencyKey: string,
  ) => dailyPlanApi.regenerateTaskGuidance(planId, versionId, itemId, input, idempotencyKey),
  getCurrentExecution: dailyPlanApi.getCurrentTaskGuidanceExecution,
  getExecution: (executionId: string) =>
    apiRequest<AiExecution>(`/api/v1/ai-executions/${executionId}`),
};

export function isActiveTaskGuidanceExecution(execution: AiExecution) {
  return execution.status === "QUEUED" || execution.status === "RUNNING";
}

export function belongsToTaskGuidance(execution: AiExecution, itemId: string) {
  return (
    execution.purpose === "TASK_GUIDANCE_GENERATION" &&
    execution.targetType === "DAILY_PLAN_ITEM" &&
    execution.targetId === itemId
  );
}

export function rememberTaskGuidanceExecution(
  planId: string,
  versionId: string,
  itemId: string,
  executionId: string,
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey(planId, versionId, itemId), executionId);
  } catch {
    // Recovery storage is optional. The server-side current-execution endpoint remains available.
  }
}

export function readRememberedTaskGuidanceExecution(
  planId: string,
  versionId: string,
  itemId: string,
) {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(storageKey(planId, versionId, itemId));
  } catch {
    return null;
  }
}

export function clearRememberedTaskGuidanceExecution(
  planId: string,
  versionId: string,
  itemId: string,
  expectedExecutionId?: string,
) {
  if (typeof window === "undefined") return;

  try {
    const key = storageKey(planId, versionId, itemId);
    if (expectedExecutionId && window.sessionStorage.getItem(key) !== expectedExecutionId) {
      return;
    }
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function storageKey(planId: string, versionId: string, itemId: string) {
  return `${STORAGE_KEY_PREFIX}${planId}:${versionId}:${itemId}`;
}
