import { apiRequest } from "@/lib/api-client";
import type {
  AiExecution,
  AvailableLearningUnit,
  DailyPlanItem,
  DailyPlanTaskStepsResponse,
  DailyPlanTaskProgressHistory,
  DailyPlanVersion,
  DailyTaskCategory,
  ProgressEntry,
  ProgressEntryStatus,
  TaskGuidanceOverview,
  TaskGuidanceRevision,
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

export interface RegenerateTaskGuidanceInput {
  adjustmentInstruction?: string;
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

  getTaskGuidanceOverview: (
    planId: string,
    versionId: string,
    itemId: string,
    page = 0,
    size = 10,
  ) => {
    const parameters = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    return apiRequest<TaskGuidanceOverview>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/guidance?${parameters}`,
    );
  },

  getTaskGuidanceRevision: (
    planId: string,
    versionId: string,
    itemId: string,
    revisionId: string,
  ) =>
    apiRequest<TaskGuidanceRevision>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/guidance/${revisionId}`,
    ),

  generateTaskGuidance: (
    planId: string,
    versionId: string,
    itemId: string,
    idempotencyKey: string,
  ) =>
    apiRequest<AiExecution>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/guidance/generate`,
      {
        method: "POST",
        headers: idempotencyHeaders(idempotencyKey),
      },
    ),

  regenerateTaskGuidance: (
    planId: string,
    versionId: string,
    itemId: string,
    input: RegenerateTaskGuidanceInput,
    idempotencyKey: string,
  ) =>
    apiRequest<AiExecution>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/guidance/regenerate`,
      {
        method: "POST",
        headers: idempotencyHeaders(idempotencyKey),
        body: JSON.stringify(input),
      },
    ),

  getCurrentTaskGuidanceExecution: (planId: string, versionId: string, itemId: string) =>
    apiRequest<AiExecution>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/guidance/execution/current`,
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
