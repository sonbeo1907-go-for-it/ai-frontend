import { apiRequest } from "@/lib/api-client";
import type { AiExecution } from "@/types/api";

const STORAGE_KEY_PREFIX = "daily-plan-ai-execution:";

export function queueDailyPlanGeneration(dailyPlanId: string, idempotencyKey: string) {
  return apiRequest<AiExecution>(`/api/v1/daily-plans/${dailyPlanId}/generate-ai`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function queueDailyPlanRegeneration(dailyPlanId: string, idempotencyKey: string) {
  return apiRequest<AiExecution>(`/api/v1/daily-plans/${dailyPlanId}/regenerate-ai`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function getAiExecution(executionId: string) {
  return apiRequest<AiExecution>(`/api/v1/ai-executions/${executionId}`);
}

export function getLatestDailyPlanAiExecution(dailyPlanId: string) {
  return apiRequest<AiExecution>(`/api/v1/daily-plans/${dailyPlanId}/ai-executions/current`);
}

export function isActiveAiExecution(execution: AiExecution) {
  return execution.status === "QUEUED" || execution.status === "RUNNING";
}

export function belongsToDailyPlan(execution: AiExecution, dailyPlanId: string) {
  return (
    execution.purpose === "DAILY_PLAN_GENERATION" &&
    execution.targetType === "DAILY_PLAN" &&
    execution.targetId === dailyPlanId
  );
}

export function rememberDailyPlanAiExecution(dailyPlanId: string, executionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(dailyPlanId), executionId);
  } catch {
    // Recovery storage is optional; polling still works while the page is mounted.
  }
}

export function readRememberedDailyPlanAiExecution(dailyPlanId: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(storageKey(dailyPlanId));
  } catch {
    return null;
  }
}

export function clearRememberedDailyPlanAiExecution(
  dailyPlanId: string,
  expectedExecutionId?: string,
) {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey(dailyPlanId);
    if (expectedExecutionId && window.sessionStorage.getItem(key) !== expectedExecutionId) {
      return;
    }
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function storageKey(dailyPlanId: string) {
  return `${STORAGE_KEY_PREFIX}${dailyPlanId}`;
}
