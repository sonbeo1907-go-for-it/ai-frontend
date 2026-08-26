import { apiRequest } from "@/lib/api-client";
import type {
  DailyEvaluation,
  QuizDetail,
  SelfEvaluationPayload,
  SubmitQuizPayload,
} from "@/types/api";

export async function generateDailyQuiz(dailyPlanId: string): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/api/v1/daily-plans/${dailyPlanId}/quiz/generate`, {
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
