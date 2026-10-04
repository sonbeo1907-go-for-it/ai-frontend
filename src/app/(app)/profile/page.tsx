"use client";
import { useState } from "react";
import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { isValidStudyDuration } from "@/lib/study-duration";
import { getBrowserDetectedTimeZone, isValidIanaTimeZone } from "@/lib/timezones";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { PasswordPolicyHints } from "@/components/auth/password-policy-hints";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validatePasswordPolicy,
  extractPasswordErrorMessage,
} from "@/lib/password-policy";
import type { ProfileResponse } from "@/types/api";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState<{
    displayName: string;
    timeZone: string;
    defaultDailyMinutes?: number;
  }>(() => ({
    displayName: profile?.profile?.displayName ?? "",
    timeZone: profile?.profile?.timeZone ?? "",
    defaultDailyMinutes: profile?.profile?.defaultDailyMinutes ?? 60,
  }));
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const { isValid: isNewPasswordValid } = validatePasswordPolicy(password.newPassword);
  const confirmationMismatch =
    password.confirmPassword.length > 0 &&
    password.newPassword !== password.confirmPassword;

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest<ProfileResponse>("/api/v1/profile", {
        method: "PATCH",
        body: JSON.stringify({ ...form, locale: "vi" }),
      });
      await refreshProfile();
      show("Hồ sơ cá nhân đã được cập nhật.");
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();

    if (!isNewPasswordValid) {
      show("Mật khẩu mới chưa thỏa mãn chính sách bảo mật.", "error");
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      show("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    setChanging(true);
    try {
      await apiRequest<void>("/api/v1/profile/password", {
        method: "PUT",
        body: JSON.stringify(password),
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      show("Mật khẩu đã được thay đổi. Các phiên khác đã bị thu hồi.");
    } catch (error) {
      show(extractPasswordErrorMessage(error, "newPassword") || getErrorMessage(error), "error");
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr] animate-fade-up">
      <Card className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            <UserRound className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-black">Thông tin dùng chung</h2>
            <p className="mt-1 text-sm text-slate-500">
              Áp dụng cho toàn bộ tài khoản, không thay đổi thông số riêng của từng lộ trình.
            </p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="mt-7 space-y-5">
          <Field label="Email">
            <Input value={profile?.email ?? ""} disabled />
          </Field>
          <Field label="Tên hiển thị">
            <Input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              required
            />
          </Field>
          <Field
            label="Múi giờ làm việc & học tập"
            hint="Chọn múi giờ chuẩn IANA dùng để tính toán ngày học và báo cáo."
          >
            <TimezonePicker
              value={form.timeZone}
              onChange={(timeZone) => setForm({ ...form, timeZone })}
              suggestedTimeZone={getBrowserDetectedTimeZone()}
            />
          </Field>
          <StudyDurationField
            value={form.defaultDailyMinutes}
            onChange={(defaultDailyMinutes) => setForm({ ...form, defaultDailyMinutes })}
            legend="Thời lượng học mặc định (Tài khoản)"
            description="Dùng làm mức dự phòng khi lộ trình hoặc kế hoạch ngày không đặt quỹ thời gian riêng. Thay đổi ở đây không làm thay đổi các cam kết lộ trình hiện có."
          />
          <Button
            type="submit"
            loading={saving}
            disabled={
              !form.displayName.trim() ||
              !isValidIanaTimeZone(form.timeZone) ||
              !isValidStudyDuration(form.defaultDailyMinutes)
            }
          >
            <Save className="size-4" />
            Lưu thay đổi
          </Button>
        </form>
      </Card>
      <div className="space-y-6">
        <Card className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">Đổi mật khẩu</h2>
              <p className="mt-1 text-sm text-slate-500">
                Các phiên đăng nhập khác sẽ bị thu hồi sau khi thay đổi.
              </p>
            </div>
          </div>
          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <Field label="Mật khẩu hiện tại">
              <Input
                type="password"
                value={password.currentPassword}
                onChange={(event) =>
                  setPassword({ ...password, currentPassword: event.target.value })
                }
                required
              />
            </Field>
            <Field label="Mật khẩu mới">
              <Input
                type="password"
                value={password.newPassword}
                onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
              />
            </Field>
            <PasswordPolicyHints password={password.newPassword} />
            <Field
              label="Xác nhận mật khẩu"
              error={confirmationMismatch ? "Mật khẩu xác nhận không khớp." : undefined}
            >
              <Input
                type="password"
                value={password.confirmPassword}
                onChange={(event) =>
                  setPassword({ ...password, confirmPassword: event.target.value })
                }
                required
              />
            </Field>
            <Button
              variant="secondary"
              type="submit"
              loading={changing}
              disabled={
                !password.currentPassword ||
                !isNewPasswordValid ||
                !password.confirmPassword ||
                confirmationMismatch
              }
            >
              Cập nhật mật khẩu
            </Button>
          </form>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/60 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-extrabold text-emerald-900">Dữ liệu học tập riêng tư</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                ADMIN không có quyền xem hồ sơ, tài liệu, lộ trình hoặc kế hoạch học tập cá nhân của
                bạn.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
