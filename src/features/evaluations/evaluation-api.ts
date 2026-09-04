import { apiRequest } from "@/lib/api-client";
import type {
  AiExecution,
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

export async function getDailyQuiz(dailyPlanId: string, quizId: string): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/api/v1/daily-plans/${dailyPlanId}/quiz/${quizId}`);
}

export async function queueDailyQuizGeneration(
  dailyPlanId: string,
  idempotencyKey: string,
): Promise<AiExecution> {
  return apiRequest<AiExecution>(`/api/v1/daily-plans/${dailyPlanId}/quiz/generate`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function getLatestDailyQuizExecution(dailyPlanId: string): Promise<AiExecution> {
  return apiRequest<AiExecution>(`/api/v1/daily-plans/${dailyPlanId}/quiz/ai-executions/current`);
}

export async function getAiExecution(executionId: string): Promise<AiExecution> {
  return apiRequest<AiExecution>(`/api/v1/ai-executions/${executionId}`);
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

export async function getDailyEvaluation(dailyPlanId: string): Promise<DailyEvaluation | null> {
  return apiRequest<DailyEvaluation | null>(`/api/v1/daily-plans/${dailyPlanId}/evaluation`);
}
