"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import type { AiExecution, MasteryCheckResult, QuizDetail, WeakTopic } from "@/types/api";
import { getAiExecution } from "./evaluation-api";
import {
  getLatestMasteryCheckExecution,
  getMasteryCheckHistory,
  getMasteryCheckQuiz,
  queueMasteryCheckGeneration,
  submitMasteryCheck,
} from "./weak-topics-api";

interface MasteryCheckModalProps {
  topic: WeakTopic | null;
  onClose: () => void;
  onUpdated: () => void;
}

function isRunning(execution: AiExecution | null) {
  return execution?.status === "QUEUED" || execution?.status === "RUNNING";
}

export function MasteryCheckModal({ topic, onClose, onUpdated }: MasteryCheckModalProps) {
  const [execution, setExecution] = useState<AiExecution | null>(null);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MasteryCheckResult | null>(null);
  const [history, setHistory] = useState<QuizDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const weakTopicId = topic?.id;

  const loadQuiz = useCallback(async (topicId: string, quizId: string) => {
    const loaded = await getMasteryCheckQuiz(topicId, quizId);
    setQuiz(loaded);
    setAnswers(
      Object.fromEntries(
        loaded.questions
          .filter((question) => question.userAnswer)
          .map((question) => [question.id, question.userAnswer as string]),
      ),
    );
  }, []);

  useEffect(() => {
    if (!weakTopicId) return;
    let cancelled = false;

    async function recover() {
      setLoading(true);
      setExecution(null);
      setQuiz(null);
      setResult(null);
      setAnswers({});
      setHistory([]);
      setError("");
      try {
        const [latest, quizzes] = await Promise.all([
          getLatestMasteryCheckExecution(weakTopicId!).catch((requestError) => {
            if (requestError instanceof ApiClientError && requestError.details.status === 404) {
              return null;
            }
            throw requestError;
          }),
          getMasteryCheckHistory(weakTopicId!),
        ]);
        if (cancelled) return;
        setHistory(quizzes);
        setExecution(latest);
        if (latest?.status === "SUCCEEDED" && latest.resultType === "QUIZ" && latest.resultId) {
          await loadQuiz(weakTopicId!, latest.resultId);
        } else if (!latest && quizzes.length > 0) {
          await loadQuiz(weakTopicId!, quizzes[0].id);
        }
      } catch (requestError) {
        if (!cancelled) setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void recover();
    return () => {
      cancelled = true;
    };
  }, [loadQuiz, weakTopicId]);

  useEffect(() => {
    if (!weakTopicId || !execution || !isRunning(execution)) return;
    const executionId = execution.id;
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      if (cancelled || document.visibilityState === "hidden") return;
      try {
        const latest = await getAiExecution(executionId);
        if (cancelled) return;
        setExecution(latest);
        if (latest.status === "SUCCEEDED") {
          if (latest.resultType !== "QUIZ" || !latest.resultId) {
            setError("AI hoàn tất nhưng không trả về bài kiểm tra hợp lệ.");
            return;
          }
          await loadQuiz(weakTopicId!, latest.resultId);
          setHistory(await getMasteryCheckHistory(weakTopicId!));
        } else if (isRunning(latest)) {
          timer = window.setTimeout(() => void poll(), 2_000);
        }
      } catch (requestError) {
        if (cancelled) return;
        setError(getErrorMessage(requestError));
        timer = window.setTimeout(() => void poll(), 5_000);
      }
    }

    function handleVisibilityChange() {
      if (timer !== undefined) window.clearTimeout(timer);
      if (document.visibilityState === "visible") void poll();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    timer = window.setTimeout(() => void poll(), 2_000);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [execution, loadQuiz, weakTopicId]);

  async function generate() {
    if (!weakTopicId || submitting || isRunning(execution)) return;
    setSubmitting(true);
    setError("");
    try {
      const queued = await queueMasteryCheckGeneration(weakTopicId, crypto.randomUUID());
      setQuiz(null);
      setResult(null);
      setAnswers({});
      setExecution(queued);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!weakTopicId || !quiz || submitting || quiz.status === "SUBMITTED") return;
    if (Object.keys(answers).length !== quiz.questions.length) {
      setError("Hãy trả lời đầy đủ tất cả câu hỏi trước khi nộp bài.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const submitted = await submitMasteryCheck(weakTopicId, quiz.id, {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          selectedOption: answers[question.id],
        })),
      });
      setResult(submitted);
      setQuiz((previous) =>
        previous?.id === quiz.id
          ? {
              ...previous,
              status: "SUBMITTED",
              score: submitted.quizScore,
              passed: submitted.isMastered,
            }
          : previous,
      );
      onUpdated();
      try {
        await loadQuiz(weakTopicId, quiz.id);
        setHistory(await getMasteryCheckHistory(weakTopicId));
      } catch (refreshError) {
        setError(getErrorMessage(refreshError));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!topic) return null;

  const completed = quiz?.status === "SUBMITTED";
  const mastered = result?.isMastered ?? quiz?.passed ?? false;

  return (
    <Modal
      open={Boolean(topic)}
      onClose={onClose}
      confirmClose={!completed && Object.keys(answers).length > 0}
      title="Kiểm tra củng cố"
      description={`${topic.learningUnitTitle || topic.topicTitle} · Cần đúng ít nhất 4/5 câu (80%).`}
      width="max-w-2xl"
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-1">
        {loading || isRunning(execution) ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <LoaderCircle className="size-9 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-600">
              {loading
                ? "Đang tải bài kiểm tra..."
                : "AI đang tạo bài kiểm tra. Bạn có thể đóng cửa sổ và quay lại sau."}
            </p>
          </div>
        ) : quiz ? (
          <>
            {completed && (
              <div
                className={`rounded-xl p-4 text-sm ${mastered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
              >
                <p className="font-bold">{mastered ? "Đã nắm vững" : "Cần củng cố thêm"}</p>
                <p>{result?.message || `Kết quả: ${quiz.score?.toFixed(1) ?? 0}%`}</p>
              </div>
            )}
            {quiz.questions.map((question, index) => (
              <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-bold text-slate-900">Câu {index + 1}</legend>
                <p className="mb-3 text-sm text-slate-800">{question.questionText}</p>
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="radio"
                        name={`mastery-${question.id}`}
                        value={option.key}
                        checked={answers[question.id] === option.key}
                        disabled={completed}
                        onChange={() =>
                          setAnswers((previous) => ({ ...previous, [question.id]: option.key }))
                        }
                      />
                      <span>
                        <strong>{option.key}.</strong> {option.text}
                      </span>
                    </label>
                  ))}
                </div>
                {completed && (
                  <p className="mt-3 text-xs text-slate-600">
                    Đáp án đúng: {question.correctOption}. {question.explanation}
                  </p>
                )}
              </fieldset>
            ))}
            <div className="flex justify-end gap-2">
              {completed && topic.status !== "MASTERED" && !result?.isMastered ? (
                <Button onClick={() => void generate()} loading={submitting}>
                  <RefreshCw className="size-4" /> Tạo bài kiểm tra mới
                </Button>
              ) : !completed ? (
                <Button onClick={() => void submit()} loading={submitting}>
                  Nộp bài
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-4 py-8 text-center">
            <p className="text-sm text-slate-600">
              {execution?.status === "FAILED"
                ? "AI chưa thể tạo bài kiểm tra. Chủ đề này vẫn cần được củng cố."
                : "Tạo bài kiểm tra dành riêng cho đơn vị học này."}
            </p>
            {topic.status !== "MASTERED" && (
              <Button onClick={() => void generate()} loading={submitting}>
                {execution?.status === "FAILED" ? "Thử lại" : "Tạo bài kiểm tra"}
              </Button>
            )}
          </div>
        )}
        {(error || execution?.failureMessage) && (
          <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error || execution?.failureMessage}
          </p>
        )}
        {history.length > 0 && !isRunning(execution) && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-sm font-bold text-slate-900">Lịch sử kiểm tra</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((pastQuiz, index) => (
                <Button
                  key={pastQuiz.id}
                  size="sm"
                  variant={quiz?.id === pastQuiz.id ? "primary" : "secondary"}
                  onClick={() => {
                    setResult(null);
                    void loadQuiz(weakTopicId!, pastQuiz.id).catch((requestError) =>
                      setError(getErrorMessage(requestError)),
                    );
                  }}
                >
                  Lần {history.length - index}
                  {pastQuiz.status === "SUBMITTED" && pastQuiz.score != null
                    ? ` · ${pastQuiz.score}%`
                    : " · Chưa nộp"}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
