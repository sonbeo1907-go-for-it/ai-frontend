"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-context";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { consumeAuthenticationExpiredNotice, getErrorMessage } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const noticeId = window.setTimeout(() => {
      if (consumeAuthenticationExpiredNotice()) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
      }
    }, 0);
    return () => window.clearTimeout(noticeId);
  }, []);
  const finish = useCallback(
    (role: "USER" | "ADMIN", setupComplete: boolean) => {
      const requested = params.get("next");
      router.replace(
        role === "ADMIN"
          ? "/admin"
          : !setupComplete
            ? "/onboarding/profile"
            : requested?.startsWith("/")
              ? requested
              : "/dashboard",
      );
    },
    [params, router],
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await login(email.trim().toLowerCase(), password);
      finish(profile.role, Boolean(profile.profile?.setupCompleted));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="lg:hidden">
        <p className="text-xl font-black text-indigo-700">Lumio</p>
      </div>
      <p className="mt-8 text-sm font-bold uppercase tracking-[.16em] text-indigo-600 lg:mt-0">
        Chào mừng trở lại
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        Đăng nhập để tiếp tục
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Quay lại lộ trình và kế hoạch đang dang dở của bạn.
      </p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input
              className="pl-10"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ban@example.com"
              required
            />
          </div>
        </Field>
        <Field label="Mật khẩu">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <Input
              className="px-10"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
            href="/forgot-password"
          >
            Quên mật khẩu?
          </Link>
        </div>
        {error && (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Đăng nhập
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        HOẶC
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleSignIn onSuccess={finish} />
      <p className="mt-7 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link className="font-extrabold text-indigo-600 hover:text-indigo-800" href="/register">
          Đăng ký miễn phí
        </Link>
      </p>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
