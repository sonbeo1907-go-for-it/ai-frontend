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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  statuses?: WeakTopicStatus[],
): Promise<WeakTopic[]> {
  // MOCK DATA for US-WEK-01 testing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "wt-1",
          roadmapId,
          roadmapItemId: "item-1",
          topicTitle: "Cơ bản về React Hooks",
          milestoneTitle: "React Fundamentals",
          status: "UNRESOLVED",
          triggerSource: "QUIZ_FAILED",
          lastQuizScore: 65.5,
          lastUnderstandingRating: 3,
          unresolvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: "wt-2",
          roadmapId,
          roadmapItemId: "item-2",
          topicTitle: "State Management với Redux",
          milestoneTitle: "Advanced React",
          status: "IN_REVIEW",
          triggerSource: "LOW_RATING",
          lastQuizScore: 85,
          lastUnderstandingRating: 2,
          unresolvedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: "wt-3",
          roadmapId,
          roadmapItemId: "item-3",
          topicTitle: "Tối ưu hóa hiệu suất (useMemo)",
          milestoneTitle: "Performance",
          status: "MASTERED",
          triggerSource: "BOTH",
          lastQuizScore: 50,
          lastUnderstandingRating: 1,
          unresolvedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          masteredAt: new Date().toISOString(),
        }
      ]);
    }, 500);
  });
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
