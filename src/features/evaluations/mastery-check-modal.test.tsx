import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiExecution, QuizDetail, WeakTopic } from "@/types/api";
import { MasteryCheckModal } from "./mastery-check-modal";
import {
  getLatestMasteryCheckExecution,
  getMasteryCheckHistory,
  getMasteryCheckQuiz,
  queueMasteryCheckGeneration,
  submitMasteryCheck,
} from "./weak-topics-api";

vi.mock("./weak-topics-api", () => ({
  getLatestMasteryCheckExecution: vi.fn(),
  getMasteryCheckHistory: vi.fn(),
  getMasteryCheckQuiz: vi.fn(),
  queueMasteryCheckGeneration: vi.fn(),
  submitMasteryCheck: vi.fn(),
}));

vi.mock("./evaluation-api", () => ({ getAiExecution: vi.fn() }));

const topic: WeakTopic = {
  id: "weak-1",
  roadmapId: "roadmap-1",
  roadmapVersionId: "version-1",
  roadmapItemId: "unit-1",
  targetItemType: "LEARNING_UNIT",
  learningUnitId: "unit-1",
  learningUnitTitle: "Encapsulation",
  topicId: "topic-1",
  status: "UNRESOLVED",
  triggerSource: "LOW_RATING",
  unresolvedAt: "2026-09-20T00:00:00Z",
  eligibleOn: "2026-09-21",
  eligibilityZone: "Asia/Ho_Chi_Minh",
};

const execution: AiExecution = {
  id: "execution-1",
  entityVersion: 1,
  providerConfigId: "provider-1",
  purpose: "QUIZ_GENERATION",
  operation: "GENERATE",
  targetType: "WEAK_TOPIC",
  targetId: topic.id,
  status: "SUCCEEDED",
  resultType: "QUIZ",
  resultId: "quiz-1",
  attemptCount: 1,
  createdAt: "2026-09-21T00:00:00Z",
  updatedAt: "2026-09-21T00:01:00Z",
};

const generatedQuiz: QuizDetail = {
  id: "quiz-1",
  roadmapId: topic.roadmapId,
  quizType: "MASTERY_CHECK",
  status: "GENERATED",
  questions: Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index + 1}`,
    roadmapItemId: topic.learningUnitId,
    questionText: `Câu hỏi ${index + 1}?`,
    options: [
      { key: "A", text: "Đáp án A" },
      { key: "B", text: "Đáp án B" },
      { key: "C", text: "Đáp án C" },
      { key: "D", text: "Đáp án D" },
    ],
  })),
};

describe("MasteryCheckModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLatestMasteryCheckExecution).mockResolvedValue(execution);
    vi.mocked(getMasteryCheckHistory).mockResolvedValue([generatedQuiz]);
    vi.mocked(getMasteryCheckQuiz).mockResolvedValue(generatedQuiz);
  });

  it("recovers the generated quiz after reopening", async () => {
    render(<MasteryCheckModal topic={topic} onClose={vi.fn()} onUpdated={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Câu hỏi 1?")).toBeTruthy());
    expect(getLatestMasteryCheckExecution).toHaveBeenCalledWith(topic.id);
    expect(getMasteryCheckQuiz).toHaveBeenCalledWith(topic.id, "quiz-1");
    expect(screen.queryByText(/Đáp án đúng:/)).toBeNull();
  });

  it("submits all five answers and reports an 80 percent mastery result", async () => {
    const onUpdated = vi.fn();
    vi.mocked(submitMasteryCheck).mockResolvedValue({
      weakTopicId: topic.id,
      quizId: "quiz-1",
      attemptId: "attempt-1",
      quizScore: 80,
      correctCount: 4,
      totalCount: 5,
      isMastered: true,
      weakTopicStatus: "MASTERED",
      canRetry: false,
      message: "Bạn đã nắm vững đơn vị học này.",
    });
    vi.mocked(getMasteryCheckQuiz)
      .mockResolvedValueOnce(generatedQuiz)
      .mockResolvedValueOnce({
        ...generatedQuiz,
        status: "SUBMITTED",
        score: 80,
        passed: true,
      });

    render(<MasteryCheckModal topic={topic} onClose={vi.fn()} onUpdated={onUpdated} />);
    await waitFor(() => expect(screen.getByText("Câu hỏi 1?")).toBeTruthy());

    const options = screen.getAllByRole("radio");
    [0, 4, 8, 12, 17].forEach((index) => fireEvent.click(options[index]));
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));

    await waitFor(() => expect(submitMasteryCheck).toHaveBeenCalledTimes(1));
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Bạn đã nắm vững đơn vị học này.")).toBeTruthy();
  });

  it("allows a newly reopened topic to start a new check after a past passing quiz", async () => {
    const pastQuiz = {
      ...generatedQuiz,
      status: "SUBMITTED" as const,
      score: 80,
      passed: true,
    };
    vi.mocked(getMasteryCheckHistory).mockResolvedValue([pastQuiz]);
    vi.mocked(getMasteryCheckQuiz).mockResolvedValue(pastQuiz);
    vi.mocked(queueMasteryCheckGeneration).mockResolvedValue({
      ...execution,
      id: "execution-2",
      status: "QUEUED",
      resultId: undefined,
      resultType: undefined,
    });

    render(<MasteryCheckModal topic={topic} onClose={vi.fn()} onUpdated={vi.fn()} />);

    const retry = await screen.findByRole("button", { name: /Tạo bài kiểm tra mới/ });
    fireEvent.click(retry);
    await waitFor(() => expect(queueMasteryCheckGeneration).toHaveBeenCalledTimes(1));
  });
});
