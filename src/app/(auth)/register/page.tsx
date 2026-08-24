"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/api-client";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const checks = [
    { label: "Ít nhất 8 ký tự", ok: form.password.length >= 8 },
    {
      label: "Có chữ hoa và chữ thường",
      ok: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password),
    },
    { label: "Có ít nhất một chữ số", ok: /\d/.test(form.password) },
  ];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      await register(form.email.trim().toLowerCase(), form.password, form.displayName.trim());
      setDone(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }
  if (done)
    return (
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Check className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">Tài khoản đã sẵn sàng</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Yêu cầu đăng ký đã được tiếp nhận. Bạn có thể đăng nhập bằng email vừa sử dụng.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700"
        >
          Đi đến đăng nhập
        </Link>
      </div>
    );
  return (
    <div className="w-full max-w-md animate-fade-up">
      <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">
        Bắt đầu miễn phí
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        Tạo tài khoản học tập
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Chỉ cần một phút để tạo không gian học tập riêng của bạn.
      </p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <Field label="Tên hiển thị">
          <div className="relative">
            <UserRound className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input
              className="pl-10"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              maxLength={150}
              required
            />
          </div>
        </Field>
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </Field>
        <Field label="Mật khẩu">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            minLength={8}
            maxLength={100}
            required
          />
        </Field>
        <div className="grid gap-1.5">
          {checks.map((check) => (
            <span
              key={check.label}
              className={`flex items-center gap-2 text-xs font-semibold ${check.ok ? "text-emerald-700" : "text-slate-400"}`}
            >
              <Check className="size-3.5" />
              {check.label}
            </span>
          ))}
        </div>
        <Field label="Xác nhận mật khẩu">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
            required
          />
        </Field>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!checks.every((check) => check.ok)}
        >
          Tạo tài khoản
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link className="font-extrabold text-indigo-600" href="/login">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
