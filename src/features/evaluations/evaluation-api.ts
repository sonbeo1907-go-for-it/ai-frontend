import { apiRequest } from "@/lib/api-client";
import type {
  DailyEvaluation,
  QuizDetail,
  SelfEvaluationPayload,
  SubmitQuizPayload,
} from "@/types/api";

export async function getLatestDailyQuiz(dailyPlanId: string): Promise<QuizDetail | null> {
  return apiRequest<QuizDetail | null>(`/api/v1/daily-plans/${dailyPlanId}/quiz`);
}

export async function getAllDailyQuizzes(dailyPlanId: string): Promise<QuizDetail[]> {
  return apiRequest<QuizDetail[]>(`/api/v1/daily-plans/${dailyPlanId}/quizzes`);
}

export async function generateDailyQuiz(
  dailyPlanId: string,
  forceNew: boolean = false,
): Promise<QuizDetail> {
  const query = forceNew ? "?forceNew=true" : "";
  return apiRequest<QuizDetail>(`/api/v1/daily-plans/${dailyPlanId}/quiz/generate${query}`, {
    method: "POST",
  });
}

export async function submitDailyQuiz(
  dailyPlanId: string,
  quizId: string,
  payload: SubmitQuizPayload,
): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/api/v1/daily-plans/${dailyPlanId}/quiz/${quizId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitSelfEvaluation(
  dailyPlanId: string,
  payload: SelfEvaluationPayload,
): Promise<DailyEvaluation> {
  return apiRequest<DailyEvaluation>(`/api/v1/daily-plans/${dailyPlanId}/evaluation`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDailyEvaluation(dailyPlanId: string): Promise<DailyEvaluation> {
  return apiRequest<DailyEvaluation>(`/api/v1/daily-plans/${dailyPlanId}/evaluation`);
}
