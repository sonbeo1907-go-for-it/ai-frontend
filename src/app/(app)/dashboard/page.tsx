"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck2, Clock3, Files, Plus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoading, ProgressBar } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/auth-context";
import type { DailyPlan, Material, PageResponse, Roadmap } from "@/types/api";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<{
    roadmaps: Roadmap[];
    plans: DailyPlan[];
    materials: PageResponse<Material>;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([
      apiRequest<Roadmap[]>("/api/v1/roadmaps"),
      apiRequest<DailyPlan[]>("/api/v1/daily-plans"),
      apiRequest<PageResponse<Material>>("/api/v1/materials?page=0&size=5&sort=createdAt,desc"),
    ])
      .then(([roadmaps, plans, materials]) => setData({ roadmaps, plans, materials }))
      .catch((nextError) => setError(getErrorMessage(nextError)));
  }, []);
  if (!data && !error) return <PageLoading />;
  if (!data)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
    );
  const activeRoadmaps = data.roadmaps.filter((item) => item.status === "ACTIVE").length;
  const recentPlans = [...data.plans]
    .sort((a, b) => b.planDate.localeCompare(a.planDate))
    .slice(0, 4);
  const name = profile?.profile?.displayName?.split(" ").at(-1) ?? "bạn";
  return (
    <div className="space-y-7 animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-7 text-white shadow-lg shadow-slate-200 sm:p-9">
        <div className="absolute -right-20 -top-24 size-72 rounded-full border border-white/10 bg-white/5" />
        <div className="relative max-w-2xl">
          <Badge className="border-white/20 bg-white/10 text-white">Chào {name} 👋</Badge>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Hôm nay bạn muốn tiến thêm một bước ở đâu?
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">
            Chọn một lộ trình đang học hoặc tạo kế hoạch ngày mới. Mọi thay đổi đều nằm trong quyền
            kiểm soát của bạn.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/daily-plans"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-100"
            >
              <CalendarCheck2 className="size-4" />
              Mở kế hoạch ngày
            </Link>
            <Link
              href="/onboarding/roadmap"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            >
              <Plus className="size-4" />
              Lộ trình mới
            </Link>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={BookOpen}
          label="Lộ trình đang hoạt động"
          value={activeRoadmaps}
          detail={`${data.roadmaps.length} lộ trình tổng cộng`}
          tone="indigo"
        />
        <Metric
          icon={CalendarCheck2}
          label="Kế hoạch đã tạo"
          value={data.plans.length}
          detail="Lịch sử được lưu theo ngày"
          tone="emerald"
        />
        <Metric
          icon={Files}
          label="Tài liệu cá nhân"
          value={data.materials.totalElements}
          detail="Chỉ tài khoản của bạn truy cập"
          tone="amber"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black tracking-tight">Kế hoạch gần đây</h3>
              <p className="mt-1 text-sm text-slate-500">
                Tiến độ tính từ trạng thái thực tế của từng nhiệm vụ.
              </p>
            </div>
            <Link href="/daily-plans" className="text-sm font-bold text-indigo-600">
              Xem tất cả
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {recentPlans.length ? (
              recentPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/daily-plans/${plan.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {formatDate(`${plan.planDate}T00:00:00`)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {plan.completedItemsCount}/{plan.totalItemsCount} nhiệm vụ ·{" "}
                        {plan.totalPlannedMinutes} phút
                      </p>
                    </div>
                    <span className="text-sm font-black text-indigo-700">
                      {plan.completionPercentage}%
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={plan.completionPercentage} />
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Bạn chưa tạo kế hoạch ngày nào.
              </p>
            )}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-600" />
            <h3 className="text-lg font-black tracking-tight">Bắt đầu nhanh</h3>
          </div>
          <div className="mt-5 space-y-3">
            <QuickLink
              href="/roadmaps"
              icon={BookOpen}
              title="Xây dựng lộ trình"
              detail="Thêm cột mốc và chủ đề thủ công"
            />
            <QuickLink
              href="/materials"
              icon={Files}
              title="Thêm tài liệu"
              detail="PDF, DOCX, TXT hoặc văn bản"
            />
            <QuickLink
              href="/daily-plans"
              icon={Clock3}
              title="Lên kế hoạch hôm nay"
              detail="Checklist và Pomodoro 25 phút"
            />
          </div>
        </Card>
      </section>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  detail: string;
  tone: "indigo" | "emerald" | "amber";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-950">{value}</p>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
      </div>
    </Card>
  );
}
function QuickLink({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: typeof BookOpen;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
      </span>
      <ArrowRight className="size-4 text-slate-300 group-hover:text-indigo-600" />
    </Link>
  );
}
