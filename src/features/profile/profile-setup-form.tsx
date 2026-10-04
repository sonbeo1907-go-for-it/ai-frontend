"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Globe2, Sparkles, UserRound } from "lucide-react";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { isValidStudyDuration } from "@/lib/study-duration";
import { getBrowserDetectedTimeZone, isValidIanaTimeZone } from "@/lib/timezones";
import type { ProfileResponse } from "@/types/api";

const DRAFT_STORAGE_KEY = "profile_setup_wizard_draft";

export function ProfileSetupForm() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);

  // Safe browser timezone detection
  const detected = useMemo(
    () => getBrowserDetectedTimeZone() ?? "Asia/Ho_Chi_Minh",
    [],
  );

  const [form, setForm] = useState<{
    displayName: string;
    timeZone: string;
    defaultDailyMinutes?: number;
  }>(() => {
    // Check if there is saved draft in session storage (AC6)
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          return {
            displayName: draft.displayName ?? profile?.profile?.displayName ?? "",
            timeZone: draft.timeZone ?? profile?.profile?.timeZone ?? detected,
            defaultDailyMinutes: draft.defaultDailyMinutes ?? profile?.profile?.defaultDailyMinutes ?? 60,
          };
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
    return {
      displayName: profile?.profile?.displayName || "",
      timeZone: profile?.profile?.timeZone || detected,
      defaultDailyMinutes: profile?.profile?.defaultDailyMinutes || 60,
    };
  });

  // Save draft whenever form updates (AC6)
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Ignore storage errors
    }
  }, [form]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setError("");
    try {
      await apiRequest<ProfileResponse>("/api/v1/profile/setup", {
        method: "PUT",
        body: JSON.stringify({ ...form, locale: "vi" }),
      });
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      await refreshProfile();
      router.replace("/onboarding/roadmap");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  const isStepValid =
    form.displayName.trim().length > 0 &&
    isValidIanaTimeZone(form.timeZone) &&
    isValidStudyDuration(form.defaultDailyMinutes);

  return (
    <div className="w-full max-w-2xl animate-fade-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">
            Thiết lập lần đầu
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Hãy để thời gian học đúng với bạn
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Hồ sơ chỉ lưu thông tin dùng chung. Mục tiêu và trình độ sẽ thuộc về từng lộ trình
            riêng.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {step + 1}/2
        </span>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-2">
        <div className={`h-1.5 rounded-full ${step >= 0 ? "bg-indigo-600" : "bg-slate-200"}`} />
        <div className={`h-1.5 rounded-full ${step >= 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
      </div>
      {step === 0 ? (
        <div className="space-y-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            <UserRound className="size-6" />
          </div>
          <Field label="Tên hiển thị" hint="Tên này xuất hiện trong không gian học tập của bạn.">
            <Input
              autoFocus
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              maxLength={150}
              placeholder="Ví dụ: Vũ Ngọc Duy"
            />
          </Field>
          <Button
            className="w-full sm:w-auto"
            size="lg"
            disabled={!form.displayName.trim()}
            onClick={() => setStep(1)}
          >
            Tiếp theo <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            <Globe2 className="size-6" />
          </div>
          <Field
            label="Múi giờ làm việc & học tập"
            hint="Chọn từ danh sách múi giờ chuẩn IANA. Múi giờ này quyết định việc tính toán ngày và nhắc lịch học."
          >
            <TimezonePicker
              value={form.timeZone}
              onChange={(timeZone) => setForm({ ...form, timeZone })}
              suggestedTimeZone={detected}
            />
          </Field>

          {/* AC5: Scope isolation banner */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-indigo-600" />
              <div className="text-xs text-indigo-950">
                <p className="font-bold">Phân biệt phạm vi áp dụng (Scope)</p>
                <p className="mt-1 leading-5 text-indigo-900/80">
                  Thời lượng đặt tại đây là <strong>mặc định dự phòng cho toàn bộ tài khoản</strong>. Ở bước sau, mỗi Lộ trình học (Roadmap) có thể đặt cam kết học riêng phù hợp với từng mục tiêu mà không làm thay đổi giá trị mặc định này.
                </p>
              </div>
            </div>
          </div>

          <StudyDurationField
            value={form.defaultDailyMinutes}
            onChange={(defaultDailyMinutes) => setForm({ ...form, defaultDailyMinutes })}
            legend="Thời lượng học mặc định (Tài khoản)"
            description="Mức thời gian tối thiểu 15 phút, tối đa 8 giờ (480 phút) mỗi ngày."
          />
          {error && (
            <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
              Quay lại
            </Button>
            <Button
              variant="success"
              size="lg"
              loading={loading}
              disabled={!isStepValid}
              onClick={() => void save()}
            >
              <Check className="size-4" />
              Lưu hồ sơ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

