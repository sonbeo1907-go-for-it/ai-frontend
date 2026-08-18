"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest<string>(
        "/api/v1/auth/password-reset-request",
        { method: "POST", body: JSON.stringify({ email }) },
        false,
      );
      setDone(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="w-full max-w-md animate-fade-up">
      {done ? (
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Kiểm tra hộp thư của bạn</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-extrabold text-indigo-600">
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-black tracking-tight">Quên mật khẩu?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" loading={loading}>
              Gửi hướng dẫn
            </Button>
          </form>
          <Link
            href="/login"
            className="mt-6 block text-center text-sm font-bold text-slate-500 hover:text-indigo-600"
          >
            Quay lại đăng nhập
          </Link>
        </>
      )}
    </div>
  );
}
