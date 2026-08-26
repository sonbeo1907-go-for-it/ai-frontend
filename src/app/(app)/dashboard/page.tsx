"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  Clock3,
  Files,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { useAuth } from "@/features/auth/auth-context";
import type { DailyPlanSummary, Material, PageResponse, RoadmapSummary } from "@/types/api";

type DashboardResource<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

function initialResource<T>(): DashboardResource<T> {
  return {
    data: null,
    loading: true,
    error: "",
  };
}

export default function DashboardPage() {
  const { profile } = useAuth();

  const [roadmaps, setRoadmaps] = useState<DashboardResource<{ active: number; total: number }>>(
    initialResource<{ active: number; total: number }>,
  );
  const [plans, setPlans] = useState<DashboardResource<PageResponse<DailyPlanSummary>>>(
    initialResource<PageResponse<DailyPlanSummary>>,
  );
  const [materials, setMaterials] = useState<DashboardResource<PageResponse<Material>>>(
    initialResource<PageResponse<Material>>,
  );

  const loadRoadmaps = useCallback(async () => {
    setRoadmaps((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [allRoadmaps, activeRoadmaps] = await Promise.all([
        apiRequest<PageResponse<RoadmapSummary>>("/api/v1/roadmaps?page=0&size=1"),
        apiRequest<PageResponse<RoadmapSummary>>("/api/v1/roadmaps?status=ACTIVE&page=0&size=1"),
      ]);
      setRoadmaps({
        data: {
          active: activeRoadmaps.totalElements,
          total: allRoadmaps.totalElements,
        },
        loading: false,
        error: "",
      });
    } catch (error) {
      setRoadmaps((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlans((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await apiRequest<PageResponse<DailyPlanSummary>>(
        "/api/v1/daily-plans?page=0&size=4&sort=planDate,desc",
      );
      setPlans({ data, loading: false, error: "" });
    } catch (error) {
      setPlans((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setMaterials((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await apiRequest<PageResponse<Material>>(
        "/api/v1/materials?page=0&size=5&sort=createdAt,desc",
      );
      setMaterials({ data, loading: false, error: "" });
    } catch (error) {
      setMaterials((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  useEffect(() => {
    void loadRoadmaps();
    void loadPlans();
    void loadMaterials();
  }, [loadMaterials, loadPlans, loadRoadmaps]);

  const activeRoadmaps = roadmaps.data?.active ?? 0;
  const recentPlans = plans.data?.content ?? [];
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
          detail={`${roadmaps.data?.total ?? 0} lộ trình tổng cộng`}
          tone="indigo"
          loading={roadmaps.loading && !roadmaps.data}
          error={roadmaps.error}
          onRetry={() => void loadRoadmaps()}
        />
        <Metric
          icon={CalendarCheck2}
          label="Kế hoạch đã tạo"
          value={plans.data?.totalElements ?? 0}
          detail="Lịch sử được lưu theo ngày"
          tone="emerald"
          loading={plans.loading && !plans.data}
          error={plans.error}
          onRetry={() => void loadPlans()}
        />
        <Metric
          icon={Files}
          label="Tài liệu cá nhân"
          value={materials.data?.totalElements ?? 0}
          detail="Chỉ tài khoản của bạn truy cập"
          tone="amber"
          loading={materials.loading && !materials.data}
          error={materials.error}
          onRetry={() => void loadMaterials()}
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
            {plans.loading && !plans.data ? (
              <DashboardSectionLoading label="Đang tải kế hoạch gần đây…" />
            ) : plans.error && !plans.data ? (
              <DashboardSectionError message={plans.error} onRetry={() => void loadPlans()} />
            ) : recentPlans.length ? (
              recentPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/daily-plans/${plan.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {formatDateOnly(plan.planDate)}
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
            {plans.error && plans.data && (
              <DashboardSectionError message={plans.error} onRetry={() => void loadPlans()} />
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
  loading,
  error,
  onRetry,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  detail: string;
  tone: "indigo" | "emerald" | "amber";
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
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
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black text-slate-950">
          {loading ? (
            <LoaderCircle className="size-5 animate-spin text-slate-400" />
          ) : error ? (
            <AlertCircle className="size-5 text-rose-500" />
          ) : (
            value
          )}
        </p>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        {error ? (
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-left text-xs font-semibold text-rose-600 hover:text-rose-800"
            onClick={onRetry}
          >
            <RefreshCw className="size-3" />
            Thử tải lại
          </button>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
        )}
      </div>
    </Card>
  );
}

function DashboardSectionLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500">
      <LoaderCircle className="size-4 animate-spin text-indigo-600" />
      {label}
    </div>
  );
}

function DashboardSectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <span className="flex min-w-0 items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span className="break-words">{message}</span>
      </span>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1.5 font-bold hover:text-rose-900"
        onClick={onRetry}
      >
        <RefreshCw className="size-3.5" />
        Thử lại
      </button>
    </div>
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
