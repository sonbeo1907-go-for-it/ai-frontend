"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Clock3, Gauge, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { PageLoading } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import type { ProficiencyLevel, RoadmapOnboarding } from "@/types/api";
import {
  RoadmapAiGenerationModal,
  type RoadmapAiGenerationInput,
} from "./roadmap-ai-generation-modal";
import { queueRoadmapGeneration, rememberRoadmapAiExecution } from "./roadmap-ai-execution-api";

const levels: Array<{ value: ProficiencyLevel; label: string; detail: string }> = [
  { value: "BEGINNER", label: "Mới bắt đầu", detail: "Tôi chưa có nền tảng về chủ đề này." },
  {
    value: "BASIC",
    label: "Đã biết cơ bản",
    detail: "Tôi hiểu một số khái niệm và muốn học có hệ thống.",
  },
  { value: "INTERMEDIATE", label: "Trung cấp", detail: "Tôi đã thực hành và muốn đào sâu hơn." },
];

export function RoadmapOnboardingForm() {
  const router = useRouter();
  const [record, setRecord] = useState<RoadmapOnboarding | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<{
    goal: string;
    proficiencyLevel?: ProficiencyLevel;
    dailyCommitmentMinutes?: number;
    expectedDurationDays?: number;
  }>({ goal: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiError, setAiError] = useState("");
  const aiSubmissionIntentRef = useRef<{
    fingerprint: string;
    idempotencyKey: string;
  } | null>(null);
  useEffect(() => {
    void apiRequest<RoadmapOnboarding>("/api/v1/roadmap-onboarding", { method: "POST" })
      .then((data) => {
        setRecord(data);
        setForm({
          goal: data.goal ?? "",
          proficiencyLevel: data.proficiencyLevel,
          dailyCommitmentMinutes: data.dailyCommitmentMinutes,
          expectedDurationDays: data.expectedDurationDays,
        });
      })
      .catch((nextError) => setError(getErrorMessage(nextError)))
      .finally(() => setLoading(false));
  }, []);
  async function persist() {
    if (!record) return null;
    const updated = await apiRequest<RoadmapOnboarding>(
      `/api/v1/roadmap-onboarding/${record.roadmapId}`,
      { method: "PATCH", body: JSON.stringify(form) },
    );
    setRecord(updated);
    return updated;
  }
  async function next() {
    setSaving(true);
    setError("");
    try {
      await persist();
      setStep((value) => Math.min(2, value + 1));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }
  async function exit() {
    setSaving(true);
    setError("");
    try {
      await persist();
      router.push("/dashboard");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setSaving(false);
    }
  }
  async function complete() {
    if (!record) return;
    setSaving(true);
    setError("");
    try {
      await persist();
      await apiRequest<RoadmapOnboarding>(
        `/api/v1/roadmap-onboarding/${record.roadmapId}/complete`,
        { method: "POST" },
      );
      router.replace(`/roadmaps/${record.roadmapId}`);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }
  async function completeWithAi(input: RoadmapAiGenerationInput) {
    if (!record) return;

    setSaving(true);
    setError("");
    setAiError("");

    try {
      if (!record.completed) {
        await persist();
        const completedRecord = await apiRequest<RoadmapOnboarding>(
          `/api/v1/roadmap-onboarding/${record.roadmapId}/complete`,
          { method: "POST" },
        );
        setRecord(completedRecord);
      }

      const normalizedMaterialIds = [...input.materialIds].sort();
      const fingerprint = JSON.stringify(normalizedMaterialIds);
      const previousIntent = aiSubmissionIntentRef.current;
      const idempotencyKey =
        previousIntent?.fingerprint === fingerprint
          ? previousIntent.idempotencyKey
          : crypto.randomUUID();
      aiSubmissionIntentRef.current = { fingerprint, idempotencyKey };

      const execution = await queueRoadmapGeneration(
        record.roadmapId,
        normalizedMaterialIds,
        idempotencyKey,
      );
      rememberRoadmapAiExecution(record.roadmapId, execution.id);
      setAiOpen(false);
      router.replace(`/roadmaps/${record.roadmapId}`);
    } catch (nextError) {
      setAiError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading label="Đang chuẩn bị khảo sát lộ trình…" />;
  if (!record)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        {error || "Không thể bắt đầu khảo sát lộ trình."}
      </div>
    );
  const ready =
    step === 0
      ? form.goal.trim().length > 0
      : step === 1
        ? Boolean(form.proficiencyLevel)
        : Boolean(form.dailyCommitmentMinutes && form.expectedDurationDays);
  return (
    <div className="w-full max-w-3xl animate-fade-up">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">
            Lộ trình mới
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Xác định khung học tập của bạn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Các thông số dưới đây chỉ áp dụng cho lộ trình này. Bạn có thể tạo những lộ trình khác
            với mục tiêu hoàn toàn độc lập.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void exit()} loading={saving}>
          <LogOut className="size-4" />
          Lưu và thoát
        </Button>
      </div>
      <div className="my-8 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className={`h-1.5 rounded-full transition ${step >= item ? "bg-indigo-600" : "bg-slate-200"}`}
          />
        ))}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <BookOpenCheck className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">Bạn muốn học điều gì?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mô tả rõ chủ đề hoặc kết quả bạn muốn đạt được.
            </p>
            <div className="mt-6">
              <Field label="Mục tiêu học tập" hint={`${form.goal.length}/500 ký tự`}>
                <Textarea
                  autoFocus
                  rows={5}
                  maxLength={500}
                  value={form.goal}
                  onChange={(event) => setForm({ ...form, goal: event.target.value })}
                  placeholder="Ví dụ: Học Backend với Java Spring Boot để tự xây dựng REST API hoàn chỉnh…"
                />
              </Field>
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Gauge className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">Trình độ hiện tại của bạn</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn mức gần nhất với trải nghiệm thực tế.
            </p>
            <div className="mt-6 grid gap-3">
              {levels.map((level) => (
                <button
                  type="button"
                  aria-pressed={form.proficiencyLevel === level.value}
                  key={level.value}
                  onClick={() => setForm({ ...form, proficiencyLevel: level.value })}
                  className={`focus-ring rounded-2xl border p-4 text-left transition ${form.proficiencyLevel === level.value ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <span className="flex items-center justify-between">
                    <span>
                      <span className="block text-sm font-extrabold text-slate-900">
                        {level.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {level.detail}
                      </span>
                    </span>
                    {form.proficiencyLevel === level.value && (
                      <span className="grid size-6 place-items-center rounded-full bg-indigo-600 text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Clock3 className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">Cam kết và thời lượng dự kiến</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bạn có thể dành bao nhiêu thời gian và muốn hoàn thành trong bao lâu?
            </p>
            <div className="mt-6 space-y-6">
              <Field label="Quỹ thời gian mỗi ngày">
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 120].map((value) => (
                    <button
                      type="button"
                      aria-pressed={form.dailyCommitmentMinutes === value}
                      key={value}
                      onClick={() => setForm({ ...form, dailyCommitmentMinutes: value })}
                      className={`focus-ring rounded-xl border py-3 text-sm font-bold ${form.dailyCommitmentMinutes === value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {value === 60 ? "1 giờ" : value === 120 ? "2 giờ" : "30 phút"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Thời lượng kỳ vọng">
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90].map((value) => (
                    <button
                      type="button"
                      aria-pressed={form.expectedDurationDays === value}
                      key={value}
                      onClick={() => setForm({ ...form, expectedDurationDays: value })}
                      className={`focus-ring rounded-xl border py-3 text-sm font-bold ${form.expectedDurationDays === value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {value} ngày
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button onClick={() => void next()} disabled={!ready} loading={saving}>
              Tiếp theo <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void complete()}
                disabled={!ready}
                loading={saving}
              >
                Tạo thủ công
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setAiError("");
                  setAiOpen(true);
                }}
                disabled={!ready}
                loading={saving}
              >
                <Check className="size-4" />
                Sinh Lộ trình bằng AI
              </Button>
            </div>
          )}
        </div>
      </div>
      {aiOpen && (
        <RoadmapAiGenerationModal
          mode="generate"
          busy={saving}
          submissionError={aiError}
          onClose={() => {
            if (saving) return;
            setAiError("");
            setAiOpen(false);
          }}
          onSubmit={(input) => void completeWithAi(input)}
        />
      )}
    </div>
  );
}
