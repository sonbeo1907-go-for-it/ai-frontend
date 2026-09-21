"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, LogOut, ServerCog, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/states";
import { AiAnalyticsDashboard } from "@/features/admin/ai-analytics-dashboard";
import { AiProviderDashboard } from "@/features/admin/ai-provider-dashboard";
import { useAuth } from "@/features/auth/auth-context";

type AdminTab = "providers" | "analytics";

export default function AdminPage() {
  const router = useRouter();
  const { status, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("providers");

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
                AI Operations & Management
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
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
              <ShieldCheck className="size-4" />
              ADMIN workspace
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Quản trị hệ thống AI
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Quản lý provider, credential, model và giám sát hiệu năng, độ trễ, token tiêu thụ.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("providers")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "providers"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ServerCog className="size-4" />
              Cấu hình Provider
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "analytics"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="size-4" />
              Chỉ số & Analytics
            </button>
          </div>
        </section>

        {activeTab === "providers" ? <AiProviderDashboard /> : <AiAnalyticsDashboard />}
      </div>
    </main>
  );
}
