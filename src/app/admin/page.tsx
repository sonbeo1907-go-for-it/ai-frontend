"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/states";
import { AiProviderDashboard } from "@/features/admin/ai-provider-dashboard";
import { useAuth } from "@/features/auth/auth-context";

export default function AdminPage() {
  const router = useRouter();
  const { status, profile, logout } = useAuth();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "authenticated" && profile?.role !== "ADMIN") router.replace("/dashboard");
  }, [status, profile, router]);

  if (status !== "authenticated" || profile?.role !== "ADMIN") {
    return <PageLoading label="Đang kiểm tra quyền quản trị…" />;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="font-black">Lumio Admin</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                AI provider operations
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void handleLogout()}>
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
              <ShieldCheck className="size-4" />
              ADMIN workspace
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Quản trị cấu hình AI
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Quản lý provider, model và giới hạn vận hành theo từng mục đích. ADMIN không có quyền
              truy cập hồ sơ, tài liệu, lộ trình hoặc kế hoạch học tập cá nhân.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
            Secrets nằm ngoài business database
          </div>
        </section>

        <AiProviderDashboard />
      </div>
    </main>
  );
}
