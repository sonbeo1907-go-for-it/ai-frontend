import { apiRequest } from "@/lib/api-client";
import type {
  AvailableLearningUnit,
  DailyPlanItem,
  DailyPlanTaskStepsResponse,
  DailyPlanTaskProgressHistory,
  DailyPlanVersion,
  DailyTaskCategory,
  ProgressEntry,
  ProgressEntryStatus,
} from "@/types/api";

export interface DailyTaskInput {
  title: string;
  description: string;
  category: DailyTaskCategory;
  plannedMinutes: number;
  orderIndex?: number;
  learningUnitId?: string | null;
  clearLearningUnit?: boolean;
}

export interface ProgressInput {
  status: ProgressEntryStatus;
  actualMinutes: number;
  actualResult: string;
  difficulty?: number;
  understandingRating?: number;
  note: string;
}

export interface CreateTaskStepInput {
  title: string;
  guidance?: string | null;
  orderIndex?: number;
  estimatedMinutes?: number | null;
  required?: boolean;
}

export interface UpdateTaskStepInput {
  entityVersion: number;
  title: string;
  guidance?: string | null;
  orderIndex: number;
  estimatedMinutes?: number | null;
  required: boolean;
}

function idempotencyHeaders(idempotencyKey: string) {
  return { "Idempotency-Key": idempotencyKey };
}

export const dailyPlanApi = {
  getAvailableLearningUnits: (planId: string) =>
    apiRequest<AvailableLearningUnit[]>(`/api/v1/daily-plans/${planId}/available-learning-units`),

  addTask: (planId: string, versionId: string, input: DailyTaskInput) =>
    apiRequest<DailyPlanItem>(`/api/v1/daily-plans/${planId}/versions/${versionId}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateTask: (
    planId: string,
    versionId: string,
    itemId: string,
    input: DailyTaskInput & { orderIndex: number },
  ) =>
    apiRequest<DailyPlanVersion>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  getTaskSteps: (planId: string, versionId: string, itemId: string) =>
    apiRequest<DailyPlanTaskStepsResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps`,
    ),

  createTaskStep: (planId: string, versionId: string, itemId: string, input: CreateTaskStepInput) =>
    apiRequest<DailyPlanTaskStepsResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  updateTaskStep: (
    planId: string,
    versionId: string,
    itemId: string,
    stepId: string,
    input: UpdateTaskStepInput,
  ) =>
    apiRequest<DailyPlanTaskStepsResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps/${stepId}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  deleteTaskStep: (
    planId: string,
    versionId: string,
    itemId: string,
    stepId: string,
    entityVersion: number,
  ) =>
    apiRequest<DailyPlanTaskStepsResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps/${stepId}?entityVersion=${encodeURIComponent(entityVersion)}`,
      { method: "DELETE" },
    ),

  setTaskStepCompletion: (
    planId: string,
    versionId: string,
    itemId: string,
    stepId: string,
    completed: boolean,
    stateVersion?: number | null,
  ) =>
    apiRequest<DailyPlanTaskStepsResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps/${stepId}/completion`,
      {
        method: "PUT",
        body: JSON.stringify({ completed, stateVersion: stateVersion ?? null }),
      },
    ),

  recordProgress: (planId: string, itemId: string, input: ProgressInput, idempotencyKey: string) =>
    apiRequest<DailyPlanItem>(`/api/v1/daily-plans/${planId}/items/${itemId}/progress`, {
      method: "POST",
      headers: idempotencyHeaders(idempotencyKey),
      body: JSON.stringify(input),
    }),

  getProgressHistory: (planId: string, itemId: string) =>
    apiRequest<ProgressEntry[]>(`/api/v1/daily-plans/${planId}/items/${itemId}/progress`),

  getPlanProgressHistory: (planId: string) =>
    apiRequest<DailyPlanTaskProgressHistory[]>(`/api/v1/daily-plans/${planId}/progress-history`),

  correctProgress: (
    planId: string,
    itemId: string,
    progressEntryId: string,
    input: ProgressInput,
    idempotencyKey: string,
  ) =>
    apiRequest<ProgressEntry>(
      `/api/v1/daily-plans/${planId}/items/${itemId}/progress/${progressEntryId}/corrections`,
      {
        method: "POST",
        headers: idempotencyHeaders(idempotencyKey),
        body: JSON.stringify(input),
      },
    ),
};
