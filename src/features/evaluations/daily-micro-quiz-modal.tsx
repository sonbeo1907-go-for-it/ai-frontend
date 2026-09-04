"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Target,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageLoading } from "@/components/ui/states";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage } from "@/lib/api-client";
import {
  getDailyQuiz,
  getDailyEvaluation,
  getAllDailyQuizzes,
  submitDailyQuiz,
  submitSelfEvaluation,
} from "./evaluation-api";
import { useDailyQuizAiExecution } from "./use-daily-quiz-ai-execution";
import type { QuizDetail, QuizQuestion } from "@/types/api";

interface DailyMicroQuizModalProps {
  dailyPlanId: string;
  dailyPlanVersionId?: string;
  open: boolean;
  onClose: () => void;
  onQuizSubmitted?: (quiz: QuizDetail) => void;
}

export function DailyMicroQuizModal({
  dailyPlanId,
  dailyPlanVersionId,
  open,
  onClose,
  onQuizSubmitted,
}: DailyMicroQuizModalProps) {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingSelfEval, setSavingSelfEval] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizDetail | null>(null);

  // Active Question & Selection State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Self Evaluation State (US-EVL-02)
  const [rating, setRating] = useState<number>(4);
  const [feedbackNote, setFeedbackNote] = useState<string>("");
  const [selfEvalSaved, setSelfEvalSaved] = useState(false);

  const handleGenerationSucceeded = useCallback(
    async (quizId: string) => {
      const quiz = await getDailyQuiz(dailyPlanId, quizId);
      setCurrentQuiz(quiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      show("AI đã tạo xong Micro-Quiz.");
    },
    [dailyPlanId, show],
  );

  const quizExecution = useDailyQuizAiExecution(
    dailyPlanId,
    open && Boolean(dailyPlanVersionId),
    handleGenerationSucceeded,
  );

  useEffect(() => {
    if (!open || !dailyPlanId) return;

    let active = true;
    async function loadQuizData() {
      setLoading(true);
      try {
        // 1. Fetch all existing quizzes for this daily plan
        const quizzes = await getAllDailyQuizzes(dailyPlanId);
        const existingQuiz = dailyPlanVersionId
          ? (quizzes.find((quiz) => quiz.dailyPlanVersionId === dailyPlanVersionId) ?? null)
          : null;

        if (active) {
          setCurrentQuiz(existingQuiz);
          const defaultQuiz = existingQuiz;
          setCurrentIndex(0);

          // If submitted, prefill answers
          if (defaultQuiz?.status === "SUBMITTED") {
            const prefilled: Record<string, string> = {};
            defaultQuiz.questions.forEach((q) => {
              if (q.userAnswer) prefilled[q.id] = q.userAnswer;
            });
            setSelectedAnswers(prefilled);
          } else {
            setSelectedAnswers({});
          }

          // Fetch self-evaluation
          try {
            const evalRes = await getDailyEvaluation(dailyPlanId);
            if (active) {
              setRating(evalRes?.overallRating ?? 4);
              setFeedbackNote(evalRes?.feedbackNote ?? "");
              setSelfEvalSaved(evalRes?.overallRating != null);
            }
          } catch {
            // Ignore evaluation fetch error
          }
        }
      } catch (error) {
        if (active) {
          show(getErrorMessage(error), "error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadQuizData();

    return () => {
      active = false;
    };
  }, [open, dailyPlanId, dailyPlanVersionId, show]);

  const handleGenerate = async () => {
    if (quizExecution.submitting || quizExecution.active) return;
    try {
      await quizExecution.generate();
    } catch (error) {
      show(getErrorMessage(error), "error");
    }
  };

  if (!open) return null;

  const questions = currentQuiz?.questions ?? [];
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];
  const isSubmitted = currentQuiz?.status === "SUBMITTED";
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions.length;

  const handleSelectOption = (questionId: string, optionKey: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleSubmit = async () => {
    if (!currentQuiz || submitting || isSubmitted) return;

    if (answeredCount < totalQuestions) {
      const firstUnansweredIndex = questions.findIndex((question) => !selectedAnswers[question.id]);
      if (firstUnansweredIndex >= 0) setCurrentIndex(firstUnansweredIndex);
      show(`Bạn cần trả lời đủ ${totalQuestions} câu trước khi nộp bài.`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOption: selectedAnswers[q.id],
        })),
      };

      const result = await submitDailyQuiz(dailyPlanId, currentQuiz.id, payload);
      setCurrentQuiz(result);
      show("Đã nộp bài đánh giá thành công!");
      if (onQuizSubmitted) {
        onQuizSubmitted(result);
      }
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSelfEval = async () => {
    if (savingSelfEval) return;
    setSavingSelfEval(true);
    try {
      await submitSelfEvaluation(dailyPlanId, {
        overallRating: rating,
        feedbackNote: feedbackNote.trim() || undefined,
      });
      setSelfEvalSaved(true);
      show("Đã lưu đánh giá và kế hoạch cải thiện thành công!");
      if (onQuizSubmitted && currentQuiz) {
        onQuizSubmitted(currentQuiz);
      }
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setSavingSelfEval(false);
    }
  };

  const score = currentQuiz?.score ?? 0;
  const passed = currentQuiz?.passed ?? false;

  // Categorize Strengths and Weaknesses for the active quiz
  const correctQuestions = questions.filter((q) => q.isCorrect === true);
  const incorrectQuestions = questions.filter((q) => q.isCorrect === false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Micro-Quiz Đánh giá Cuối ngày"
      description={
        isSubmitted
          ? "Phân tích điểm mạnh, điểm yếu và kế hoạch cải thiện kiến thức theo từng bài kiểm tra."
          : currentQuiz
            ? `Bài kiểm tra nhanh ${totalQuestions} câu hỏi trắc nghiệm · Cần đạt tối thiểu 80% để vượt qua.`
            : "Tạo bài kiểm tra ngắn từ những nhiệm vụ Roadmap bạn đã hoàn thành."
      }
      width="max-w-3xl"
    >
      {loading || quizExecution.recovering ? (
        <div className="py-12">
          <PageLoading label="Đang tải dữ liệu bài kiểm tra của ngày hôm nay..." />
        </div>
      ) : quizExecution.active ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <LoaderCircle className="size-10 animate-spin text-indigo-600" />
          <div>
            <p className="font-bold text-slate-900">AI đang tạo Micro-Quiz</p>
            <p className="mt-1 text-sm text-slate-500">
              Bạn có thể đóng cửa sổ này. Tiến trình vẫn tiếp tục ở máy chủ.
            </p>
          </div>
        </div>
      ) : !currentQuiz || questions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Sparkles className="size-12 text-indigo-400" />
          <div className="max-w-md">
            <p className="font-bold text-slate-900">
              {quizExecution.execution?.status === "FAILED"
                ? "AI chưa thể tạo Micro-Quiz"
                : "Chưa có Micro-Quiz cho phiên bản kế hoạch hiện tại"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {quizExecution.execution?.failureMessage ||
                quizExecution.pollingError ||
                (dailyPlanVersionId
                  ? "Bạn cần hoàn thành ít nhất một nhiệm vụ có liên kết với Roadmap trước khi tạo Quiz."
                  : "Hãy kích hoạt một phiên bản kế hoạch trước khi tạo Micro-Quiz.")}
            </p>
          </div>
          <Button
            onClick={() => void handleGenerate()}
            loading={quizExecution.submitting}
            disabled={!dailyPlanVersionId}
          >
            <RefreshCw className="size-4" />
            {quizExecution.execution?.status === "FAILED"
              ? "Thử lại"
              : dailyPlanVersionId
                ? "Tạo Micro-Quiz"
                : "Kích hoạt kế hoạch trước"}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {isSubmitted ? (
            /* KẾT QUẢ & PHÂN TÍCH ĐIỂM MẠNH / ĐIỂM YẾU CỦA BÀI QUIZ ĐANG CHỌN */
            <div className="space-y-6 animate-fade-up max-h-[68vh] overflow-y-auto pr-1">
              {/* Summary Score Banner */}
              <div
                className={`rounded-2xl p-5 border text-center transition-all ${
                  passed
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-emerald-950"
                    : "bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200 text-rose-950"
                }`}
              >
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-white shadow-sm mb-2">
                  {passed ? (
                    <Award className="size-7 text-emerald-600" />
                  ) : (
                    <AlertCircle className="size-7 text-rose-500" />
                  )}
                </div>
                <h3 className="text-3xl font-black tracking-tight">{score.toFixed(1)}%</h3>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge tone={passed ? "emerald" : "rose"}>
                    {passed ? "ĐẠT YÊU CẦU (≥ 80%)" : "CHƯA ĐẠT (< 80%)"}
                  </Badge>
                  <span className="text-xs text-slate-600 font-medium">
                    (Đúng {correctQuestions.length}/{totalQuestions} câu)
                  </span>
                </div>
              </div>

              {/* 🌟 ĐÁNH GIÁ ĐIỂM MẠNH & ⚠️ ĐIỂM YẾU CHO BÀI QUIZ NÀY */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Điểm mạnh */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-3">
                    <Sparkles className="size-4 text-emerald-600" />
                    <span>🌟 Điểm mạnh (Đã nắm vững)</span>
                  </div>
                  {correctQuestions.length > 0 ? (
                    <ul className="space-y-2 text-xs text-emerald-900">
                      {correctQuestions.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100"
                        >
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block">{q.questionText}</strong>
                            <span className="text-emerald-700 font-medium">
                              Đáp án đúng: {q.correctOption}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Chưa có câu hỏi nào đạt điểm tuyệt đối trong lần làm này.
                    </p>
                  )}
                </div>

                {/* Điểm yếu */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-3">
                    <AlertTriangle className="size-4 text-rose-600" />
                    <span>⚠️ Điểm yếu (Cần củng cố)</span>
                  </div>
                  {incorrectQuestions.length > 0 ? (
                    <ul className="space-y-2 text-xs text-rose-900">
                      {incorrectQuestions.map((q) => (
                        <li
                          key={q.id}
                          className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-rose-100"
                        >
                          <XCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block">{q.questionText}</strong>
                            <span className="text-rose-700 font-medium">
                              Bạn chọn:{" "}
                              <strong className="underline">{q.userAnswer || "Chưa chọn"}</strong> ·
                              Đáp án đúng:{" "}
                              <strong className="text-emerald-700">{q.correctOption}</strong>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-white/80 p-3 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>Tuyệt vời! Không phát hiện điểm yếu nào trong lần làm này.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 📋 KẾ HOẠCH CẢI THIỆN & HÀNH ĐỘNG TIẾP THEO */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <Target className="size-5 text-indigo-600" />
                  <span>📋 Kế hoạch Cải thiện & Ôn tập Đề xuất</span>
                </div>

                <div className="grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3.5 border border-indigo-50 shadow-sm space-y-1">
                    <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-indigo-600" /> 1. Ôn tập lại nội dung hổng
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      {incorrectQuestions.length > 0
                        ? `Dành 20–30 phút trong kế hoạch ngày mai để xem lại lời giải thích của ${incorrectQuestions.length} câu hỏi chưa chính xác.`
                        : "Tiếp tục duy trì nhịp độ học tập và chuyển sang các bài học mới theo lộ trình."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3.5 border border-indigo-50 shadow-sm space-y-1">
                    <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                      <Lightbulb className="size-3.5 text-amber-500" /> 2. Phản hồi cho AI thích ứng
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      Đánh giá mức độ hiểu bài để AI cân nhắc tối đa một nhiệm vụ ôn tập, không vượt
                      quá 30% quỹ thời gian của ngày tiếp theo.
                    </p>
                  </div>
                </div>

                {/* Form Tự đánh giá mức độ hiểu bài (US-EVL-02) */}
                <div className="rounded-xl bg-white p-4 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Tự chấm điểm mức độ hiểu bài hôm nay:
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star);
                            setSelfEvalSaved(false);
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`size-5 ${
                              star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-black text-slate-700 ml-1.5">
                        {rating}/5 sao
                      </span>
                    </div>
                  </div>

                  <Field label="Ghi chú thắc mắc hoặc nội dung cần lưu ý (Tùy chọn):">
                    <Textarea
                      rows={2}
                      value={feedbackNote}
                      onChange={(e) => {
                        setFeedbackNote(e.target.value);
                        setSelfEvalSaved(false);
                      }}
                      placeholder="Ví dụ: Chưa hiểu rõ phần Async/Await, cần thêm bài tập thực hành..."
                      className="text-xs"
                    />
                  </Field>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      {selfEvalSaved ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Đã lưu đánh giá
                        </span>
                      ) : (
                        "Bấm lưu để ghi nhận cảm nhận hiểu bài vào hệ thống"
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      loading={savingSelfEval}
                      onClick={() => void handleSaveSelfEval()}
                    >
                      <Save className="size-3.5" />
                      Lưu đánh giá & Kế hoạch
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chi tiết từng câu hỏi & Lời giải thích */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                  Chi tiết từng câu hỏi & Lời giải thích:
                </h4>
                {questions.map((q, idx) => {
                  const isCorrect = q.isCorrect;
                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isCorrect ? "bg-white border-emerald-200" : "bg-white border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center size-6 rounded-lg text-xs font-bold ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <strong className="text-sm text-slate-800">{q.questionText}</strong>
                        </div>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0">
                            <CheckCircle2 className="size-4" /> Đúng
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-rose-600 shrink-0">
                            <XCircle className="size-4" /> Sai
                          </span>
                        )}
                      </div>

                      {/* Options List */}
                      <div className="mt-3 grid gap-1.5 pl-8">
                        {q.options.map((opt) => {
                          const isUserChoice = q.userAnswer === opt.key;
                          const isCorrectChoice = q.correctOption === opt.key;
                          return (
                            <div
                              key={opt.key}
                              className={`rounded-lg px-3 py-2 text-xs font-medium border flex items-center justify-between ${
                                isCorrectChoice
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                                  : isUserChoice && !isCorrect
                                    ? "bg-rose-50 border-rose-300 text-rose-800 line-through"
                                    : "bg-slate-50/50 border-slate-100 text-slate-600"
                              }`}
                            >
                              <span>
                                <strong className="mr-2 font-bold">{opt.key}.</strong>
                                {opt.text}
                              </span>
                              {isUserChoice && (
                                <span className="text-[11px] font-bold uppercase tracking-wider ml-2">
                                  (Lựa chọn của bạn)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed Explanation */}
                      {q.explanation && (
                        <div className="mt-3 ml-8 rounded-lg bg-indigo-50/80 border border-indigo-100 p-3 text-xs text-indigo-950">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-700 mb-1">
                            <HelpCircle className="size-3.5" />
                            <span>Lời giải thích chi tiết:</span>
                          </div>
                          <p className="leading-relaxed text-indigo-900/90">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button onClick={onClose} variant="secondary">
                  Đóng
                </Button>
              </div>
            </div>
          ) : (
            /* GIAO DIỆN LÀM BÀI QUIZ (KHI CHỌN LẦN LÀM CHƯA NỘP) */
            <div className="space-y-6">
              {/* Progress & Navigation Bubbles */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {questions.map((q, idx) => {
                    const isAnswered = !!selectedAnswers[q.id];
                    const isCurrent = idx === currentIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`size-8 rounded-lg text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                            : isAnswered
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0 font-medium">
                  Đã trả lời: <strong className="text-indigo-600 font-bold">{answeredCount}</strong>
                  /{totalQuestions}
                </div>
              </div>

              {/* Current Question View */}
              {currentQuestion && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge tone="indigo">Câu {currentIndex + 1}</Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      {totalQuestions === 3 && "Đúng 3/3 để Đạt"}
                      {totalQuestions === 4 && "Đúng 4/4 để Đạt"}
                      {totalQuestions === 5 && "Đúng từ 4/5 để Đạt"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-5 leading-relaxed">
                    {currentQuestion.questionText}
                  </h3>

                  {/* Options */}
                  <div className="grid gap-3">
                    {currentQuestion.options.map((opt) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left rounded-xl p-4 border transition-all flex items-start gap-3 ${
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20 text-indigo-950 font-medium"
                              : "bg-slate-50/40 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <span
                            className={`size-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-sm pt-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation & Submit Controls */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Câu trước
                </Button>

                <div className="flex items-center gap-2">
                  {currentIndex < totalQuestions - 1 ? (
                    <Button
                      onClick={() =>
                        setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                      }
                    >
                      Câu tiếp theo
                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      loading={submitting}
                      disabled={submitting || answeredCount !== totalQuestions}
                      onClick={() => void handleSubmit()}
                    >
                      <CheckCircle2 className="size-4" />
                      Nộp bài chấm điểm
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
