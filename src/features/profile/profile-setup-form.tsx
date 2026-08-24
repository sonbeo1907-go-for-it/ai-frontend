"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock3, Globe2, UserRound } from "lucide-react";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ProfileResponse } from "@/types/api";

export function ProfileSetupForm() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const detected = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
    [],
  );
  const [form, setForm] = useState({
    displayName: profile?.profile?.displayName || "",
    timeZone: profile?.profile?.timeZone || detected,
    locale: profile?.profile?.locale || "vi",
    defaultDailyMinutes: profile?.profile?.defaultDailyMinutes || 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setLoading(true);
    setError("");
    try {
      await apiRequest<ProfileResponse>("/api/v1/profile/setup", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await refreshProfile();
      router.replace("/onboarding/roadmap");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Múi giờ" hint={`Trình duyệt nhận diện: ${detected}`}>
              <Input
                value={form.timeZone}
                onChange={(event) => setForm({ ...form, timeZone: event.target.value })}
              />
            </Field>
            <Field label="Ngôn ngữ hệ thống">
              <Select
                value={form.locale}
                onChange={(event) => setForm({ ...form, locale: event.target.value })}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </Select>
            </Field>
          </div>
          <Field label="Thời lượng học mặc định">
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 120].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setForm({ ...form, defaultDailyMinutes: minutes })}
                  className={`focus-ring flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${form.defaultDailyMinutes === minutes ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  <Clock3 className="size-4" />
                  {minutes} phút
                </button>
              ))}
            </div>
          </Field>
          {error && (
            <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
              Quay lại
            </Button>
            <Button variant="success" size="lg" loading={loading} onClick={() => void save()}>
              <Check className="size-4" />
              Lưu hồ sơ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
