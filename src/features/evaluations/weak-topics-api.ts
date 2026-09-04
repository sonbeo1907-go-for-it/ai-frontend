import { apiRequest } from "@/lib/api-client";
import type {
  AiExecution,
  MasteryCheckResult,
  SubmitQuizPayload,
  WeakTopic,
  WeakTopicStatus,
} from "@/types/api";

export async function getRoadmapWeakTopics(
  roadmapId: string,
  statuses?: WeakTopicStatus[],
): Promise<WeakTopic[]> {
  const query = new URLSearchParams();
  statuses?.forEach((status) => query.append("status", status));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiRequest<WeakTopic[]>(`/api/v1/roadmaps/${roadmapId}/weak-topics${suffix}`);
}

export async function queueMasteryCheckGeneration(
  weakTopicId: string,
  idempotencyKey: string,
): Promise<AiExecution> {
  return apiRequest<AiExecution>(`/api/v1/weak-topics/${weakTopicId}/mastery-check/generate`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function submitMasteryCheck(
  weakTopicId: string,
  quizId: string,
  payload: SubmitQuizPayload,
): Promise<MasteryCheckResult> {
  return apiRequest<MasteryCheckResult>(
    `/api/v1/weak-topics/${weakTopicId}/mastery-check/${quizId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
