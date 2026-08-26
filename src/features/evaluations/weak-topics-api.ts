import { apiRequest } from "@/lib/api-client";
import type {
  MasteryCheckResult,
  QuizDetail,
  SubmitQuizPayload,
  WeakTopic,
  WeakTopicStatus,
} from "@/types/api";

export async function getRoadmapWeakTopics(
  roadmapId: string,
  statuses?: WeakTopicStatus[],
): Promise<WeakTopic[]> {
  const query = statuses?.length ? `?statuses=${statuses.join(",")}` : "";
  return apiRequest<WeakTopic[]>(`/api/v1/roadmaps/${roadmapId}/weak-topics${query}`);
}

export async function generateMasteryCheckQuiz(weakTopicId: string): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/api/v1/weak-topics/${weakTopicId}/mastery-check/generate`, {
    method: "POST",
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
