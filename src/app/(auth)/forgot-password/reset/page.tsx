"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiRequest<void>(
        "/api/v1/auth/password-reset",
        { method: "POST", body: JSON.stringify({ token, newPassword: password }) },
        false,
      );
      setDone(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }
  if (!token)
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-black">Liên kết không hợp lệ</h1>
        <p className="mt-2 text-sm text-slate-500">Liên kết đặt lại mật khẩu không chứa token.</p>
      </div>
    );
  if (done)
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-black">Đã đổi mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-500">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <Link href="/login" className="mt-6 inline-block font-bold text-indigo-600">
          Đăng nhập
        </Link>
      </div>
    );
  return (
    <form className="w-full max-w-md space-y-5" onSubmit={submit}>
      <div>
        <h1 className="text-3xl font-black">Tạo mật khẩu mới</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mật khẩu mới nên có ít nhất 8 ký tự, chữ hoa, chữ thường và số.
        </p>
      </div>
      <Field label="Mật khẩu mới">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </Field>
      <Field label="Xác nhận mật khẩu">
        <Input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
      </Field>
      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
      )}
      <Button className="w-full" size="lg" loading={loading}>
        Đặt lại mật khẩu
      </Button>
    </form>
  );
}
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
