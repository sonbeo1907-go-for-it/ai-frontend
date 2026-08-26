"use client";
import { useState } from "react";
import { Globe2, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import type { ProfileResponse } from "@/types/api";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState(() => ({
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
    setChanging(true);
    try {
      await apiRequest<void>("/api/v1/profile/password", {
        method: "PUT",
        body: JSON.stringify(password),
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      show("Mật khẩu đã được thay đổi. Các phiên khác đã bị thu hồi.");
    } catch (error) {
      show(getErrorMessage(error), "error");
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
          <Field label="Múi giờ">
            <div className="relative">
              <Globe2 className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
              <Input
                className="pl-10"
                value={form.timeZone}
                onChange={(event) => setForm({ ...form, timeZone: event.target.value })}
                required
              />
            </div>
          </Field>
          <Field label="Thời lượng học mặc định">
            <Select
              value={form.defaultDailyMinutes}
              onChange={(event) =>
                setForm({ ...form, defaultDailyMinutes: Number(event.target.value) })
              }
            >
              <option value={30}>30 phút/ngày</option>
              <option value={60}>60 phút/ngày</option>
              <option value={120}>120 phút/ngày</option>
            </Select>
          </Field>
          <Button type="submit" loading={saving}>
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
                minLength={6}
                maxLength={50}
                required
              />
            </Field>
            <Field label="Xác nhận mật khẩu">
              <Input
                type="password"
                value={password.confirmPassword}
                onChange={(event) =>
                  setPassword({ ...password, confirmPassword: event.target.value })
                }
                required
              />
            </Field>
            <Button variant="secondary" type="submit" loading={changing}>
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
