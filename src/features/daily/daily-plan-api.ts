import { ApiClientError, apiRequest } from "@/lib/api-client";
import type {
  AiExecution,
  AvailableLearningUnit,
  CompleteTaskStepAndRecordProgressResponse,
  DailyPlan,
  DailyPlanItem,
  DailyPlanSummary,
  DailyPlanTaskStepsResponse,
  DailyPlanTaskProgressHistory,
  DailyPlanVersion,
  DailyTaskCategory,
  PageResponse,
  ProgressEntry,
  ProgressEntryStatus,
  TaskGuidanceOverview,
  TaskGuidanceRevision,
} from "@/types/api";

export interface GetDailyPlansParams {
  status?: string;
  roadmapId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

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
  completionPercentage: number;
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
  getDailyPlans: (params: GetDailyPlansParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.roadmapId) searchParams.set("roadmapId", params.roadmapId);
    if (params.from) searchParams.set("from", params.from);
    if (params.to) searchParams.set("to", params.to);
    if (params.page !== undefined) searchParams.set("page", String(params.page));
    if (params.size !== undefined) searchParams.set("size", String(params.size));
    if (params.sort) searchParams.set("sort", params.sort);
    const queryString = searchParams.toString();
    return apiRequest<PageResponse<DailyPlanSummary>>(
      `/api/v1/daily-plans${queryString ? `?${queryString}` : ""}`,
    );
  },

  getTodayPlan: async (): Promise<DailyPlan | null> => {
    try {
      return await apiRequest<DailyPlan>("/api/v1/daily-plans/today");
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.details.status === 404 || error.details.code === "DAILY_PLAN_NOT_FOUND")
      ) {
        return null;
      }
      throw error;
    }
  },

  getAvailableLearningUnits: (planId: string) =>
    apiRequest<AvailableLearningUnit[]>(`/api/v1/daily-plans/${planId}/available-learning-units`),

  addTask: (planId: string, versionId: string, input: DailyTaskInput) =>
    apiRequest<DailyPlanItem>(`/api/v1/daily-plans/${planId}/versions/${versionId}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateBudget: (
    planId: string,
    versionId: string,
    availableMinutes: number,
    entityVersion: number,
  ) =>
    apiRequest<DailyPlanVersion>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/budget`,
      {
        method: "PATCH",
        body: JSON.stringify({ availableMinutes, entityVersion }),
      },
    ),

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

  completeTaskStepAndRecordProgress: (
    planId: string,
    versionId: string,
    itemId: string,
    stepId: string,
    stateVersion: number | null | undefined,
    outcome: ProgressInput,
    idempotencyKey: string,
  ) =>
    apiRequest<CompleteTaskStepAndRecordProgressResponse>(
      `/api/v1/daily-plans/${planId}/versions/${versionId}/items/${itemId}/steps/${stepId}/complete-with-outcome`,
      {
        method: "POST",
        headers: idempotencyHeaders(idempotencyKey),
        body: JSON.stringify({ stateVersion: stateVersion ?? null, outcome }),
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
