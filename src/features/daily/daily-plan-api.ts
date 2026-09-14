import { apiRequest } from "@/lib/api-client";
import type {
  AvailableLearningUnit,
  DailyPlanItem,
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
