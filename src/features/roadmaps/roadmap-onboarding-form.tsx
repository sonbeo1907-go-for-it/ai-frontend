"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Clock3,
  Gauge,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PageLoading } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import type { ProficiencyLevel, RoadmapOnboarding } from "@/types/api";
import {
  RoadmapAiGenerationModal,
  type RoadmapAiGenerationInput,
} from "./roadmap-ai-generation-modal";
import { queueRoadmapGeneration, rememberRoadmapAiExecution } from "./roadmap-ai-execution-api";

type OnboardingFormState = {
  title: string;
  goal: string;
  proficiencyLevel?: ProficiencyLevel;
  dailyCommitmentMinutes?: number;
  expectedDurationDays?: number;
};

const levels: Array<{ value: ProficiencyLevel; label: string; detail: string }> = [
  { value: "BEGINNER", label: "Mới bắt đầu", detail: "Tôi chưa có nền tảng về chủ đề này." },
  {
    value: "BASIC",
    label: "Đã biết cơ bản",
    detail: "Tôi hiểu một số khái niệm và muốn học có hệ thống.",
  },
  { value: "INTERMEDIATE", label: "Trung cấp", detail: "Tôi đã thực hành và muốn đào sâu hơn." },
];

const proficiencyLabels: Record<ProficiencyLevel, string> = {
  BEGINNER: "Mới bắt đầu",
  BASIC: "Đã biết cơ bản",
  INTERMEDIATE: "Trung cấp",
};

const stepLabels = ["Tên & mục tiêu", "Trình độ", "Cam kết", "Xác nhận"];

function formFromRecord(record: RoadmapOnboarding): OnboardingFormState {
  return {
    title: record.titleOrigin === "FALLBACK" ? "" : (record.title ?? ""),
    goal: record.goal ?? "",
    proficiencyLevel: record.proficiencyLevel,
    dailyCommitmentMinutes: record.dailyCommitmentMinutes,
    expectedDurationDays: record.expectedDurationDays,
  };
}

function firstIncompleteStep(record: RoadmapOnboarding) {
  if (!record.goal?.trim()) return 0;
  if (!record.proficiencyLevel) return 1;
  if (!record.dailyCommitmentMinutes || !record.expectedDurationDays) return 2;
  return 3;
}

function normalizedForm(form: OnboardingFormState) {
  return JSON.stringify({
    title: form.title.trim(),
    goal: form.goal.trim(),
    proficiencyLevel: form.proficiencyLevel ?? null,
    dailyCommitmentMinutes: form.dailyCommitmentMinutes ?? null,
    expectedDurationDays: form.expectedDurationDays ?? null,
  });
}

export function RoadmapOnboardingForm() {
  const router = useRouter();
  const [record, setRecord] = useState<RoadmapOnboarding | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormState>({ title: "", goal: "" });
  const [lastSavedForm, setLastSavedForm] = useState<OnboardingFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiError, setAiError] = useState("");
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const aiSubmissionIntentRef = useRef<{
    fingerprint: string;
    idempotencyKey: string;
  } | null>(null);

  const dirty = useMemo(
    () => lastSavedForm !== null && normalizedForm(form) !== normalizedForm(lastSavedForm),
    [form, lastSavedForm],
  );

  useEffect(() => {
    void apiRequest<RoadmapOnboarding>("/api/v1/roadmap-onboarding", { method: "POST" })
      .then((data) => {
        const restoredForm = formFromRecord(data);
        setRecord(data);
        setForm(restoredForm);
        setLastSavedForm(restoredForm);
        setStep(firstIncompleteStep(data));
      })
      .catch((nextError) => setError(getErrorMessage(nextError)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  async function persist() {
    if (!record) return null;

    const title = form.title.trim();
    const updated = await apiRequest<RoadmapOnboarding>(
      `/api/v1/roadmap-onboarding/${record.roadmapId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: title || undefined,
          goal: form.goal.trim() || undefined,
          proficiencyLevel: form.proficiencyLevel,
          dailyCommitmentMinutes: form.dailyCommitmentMinutes,
          expectedDurationDays: form.expectedDurationDays,
          entityVersion: record.version,
        }),
      },
    );
    const savedForm = formFromRecord(updated);
    setRecord(updated);
    setForm(savedForm);
    setLastSavedForm(savedForm);
    return updated;
  }

  async function next() {
    setSaving(true);
    setError("");
    try {
      await persist();
      setStep((value) => Math.min(3, value + 1));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function back() {
    setSaving(true);
    setError("");
    try {
      await persist();
      setStep((value) => Math.max(0, value - 1));
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
      const savedRecord = await persist();
      await apiRequest<RoadmapOnboarding>(
        `/api/v1/roadmap-onboarding/${savedRecord?.roadmapId ?? record.roadmapId}/complete`,
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
      let latestRecord = record;
      if (!record.completed) {
        const savedRecord = await persist();
        latestRecord = await apiRequest<RoadmapOnboarding>(
          `/api/v1/roadmap-onboarding/${savedRecord?.roadmapId ?? record.roadmapId}/complete`,
          { method: "POST" },
        );
        setRecord(latestRecord);
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
        latestRecord.roadmapId,
        normalizedMaterialIds,
        idempotencyKey,
      );
      rememberRoadmapAiExecution(latestRecord.roadmapId, execution.id);
      setAiOpen(false);
      router.replace(`/roadmaps/${latestRecord.roadmapId}`);
    } catch (nextError) {
      setAiError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading label="Đang chuẩn bị khảo sát lộ trình…" />;
  if (!record) {
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        {error || "Không thể bắt đầu khảo sát lộ trình."}
      </div>
    );
  }

  const ready =
    step === 0
      ? form.goal.trim().length > 0
      : step === 1
        ? Boolean(form.proficiencyLevel)
        : step === 2
          ? Boolean(form.dailyCommitmentMinutes && form.expectedDurationDays)
          : Boolean(
              form.goal.trim() &&
              form.proficiencyLevel &&
              form.dailyCommitmentMinutes &&
              form.expectedDurationDays,
            );

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
            Mỗi lộ trình có tên, mục tiêu, trình độ và quỹ thời gian riêng. Bạn có thể lưu lại và
            tiếp tục sau.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void exit()} loading={saving}>
          <LogOut className="size-4" />
          Lưu và thoát
        </Button>
      </div>

      <ol className="my-8 grid grid-cols-4 gap-2" aria-label={`Bước ${step + 1} trên 4`}>
        {stepLabels.map((label, item) => (
          <li key={label} aria-current={step === item ? "step" : undefined}>
            <span
              className={`mb-2 block h-1.5 rounded-full transition ${step >= item ? "bg-indigo-600" : "bg-slate-200"}`}
            />
            <span
              className={`hidden text-xs font-bold sm:block ${step === item ? "text-indigo-700" : "text-slate-500"}`}
            >
              {item + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <BookOpenCheck className="size-6" />
            </div>
            <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-xl font-black outline-none">
              Đặt tên và mục tiêu cho lộ trình
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tên giúp bạn phân biệt nhiều lộ trình. Nếu để trống, hệ thống sẽ gợi ý từ mục tiêu.
            </p>
            <div className="mt-6 space-y-5">
              <Field label="Tên lộ trình (không bắt buộc)" hint={`${form.title.length}/200 ký tự`}>
                <Input
                  autoFocus
                  maxLength={200}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Ví dụ: Backend Java thực chiến"
                />
              </Field>
              <Field label="Mục tiêu học tập" hint={`${form.goal.length}/500 ký tự`}>
                <Textarea
                  rows={5}
                  maxLength={500}
                  value={form.goal}
                  onChange={(event) => setForm({ ...form, goal: event.target.value })}
                  placeholder="Ví dụ: Học Spring Boot để tự xây dựng REST API hoàn chỉnh…"
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
            <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-xl font-black outline-none">
              Trình độ hiện tại của bạn
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn mức gần nhất với trải nghiệm thực tế cho mục tiêu này.
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
            <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-xl font-black outline-none">
              Cam kết và thời lượng dự kiến
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn quỹ thời gian phù hợp với lộ trình này. Bạn có thể điều chỉnh sau.
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

        {step === 3 && (
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardCheck className="size-6" />
            </div>
            <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-xl font-black outline-none">
              Kiểm tra trước khi tạo lộ trình
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Các thông tin dưới đây chỉ thuộc lộ trình này và không ảnh hưởng lộ trình khác.
            </p>
            <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-5">
              <SummaryRow
                label="Tên lộ trình"
                value={form.title.trim() || "Hệ thống sẽ gợi ý từ mục tiêu"}
                editLabel="Sửa tên và mục tiêu"
                onEdit={() => setStep(0)}
              />
              <SummaryRow label="Mục tiêu" value={form.goal.trim()} />
              <SummaryRow
                label="Trình độ"
                value={form.proficiencyLevel ? proficiencyLabels[form.proficiencyLevel] : "—"}
                editLabel="Sửa trình độ"
                onEdit={() => setStep(1)}
              />
              <SummaryRow
                label="Quỹ thời gian"
                value={`${form.dailyCommitmentMinutes ?? 0} phút/ngày`}
                editLabel="Sửa cam kết"
                onEdit={() => setStep(2)}
              />
              <SummaryRow label="Thời lượng" value={`${form.expectedDurationDays ?? 0} ngày`} />
              <SummaryRow
                label="Cách tạo"
                value="Chọn tạo thủ công hoặc sinh bản nháp bằng AI bên dưới"
              />
            </dl>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => void back()} loading={saving}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
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
                Sinh lộ trình bằng AI
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

function SummaryRow({
  label,
  value,
  editLabel,
  onEdit,
}: {
  label: string;
  value: string;
  editLabel?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold leading-6 text-slate-900">{value}</dd>
      {editLabel && onEdit && (
        <dd>
          <button
            type="button"
            className="focus-ring rounded text-xs font-bold text-indigo-700 hover:text-indigo-900"
            onClick={onEdit}
          >
            {editLabel}
          </button>
        </dd>
      )}
    </div>
  );
}
