"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Plus } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { EmptyState, PageLoading, ProgressBar } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDateOnly, todayIso } from "@/lib/format";
import { dailyPlanStatusLabels } from "@/lib/display-labels";
import type { DailyPlanSummary, PageResponse, RoadmapSummary } from "@/types/api";
import { CreatePlanModal } from "./create-plan-modal";

export function DailyPlansView() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [page, setPage] = useState<PageResponse<DailyPlanSummary> | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [nextPlans, nextRoadmaps] = await Promise.all([
        apiRequest<PageResponse<DailyPlanSummary>>(
          `/api/v1/daily-plans?page=${pageNumber}&size=12&sort=planDate,desc`,
        ),
        apiRequest<PageResponse<RoadmapSummary>>(
          "/api/v1/roadmaps?status=ACTIVE&page=0&size=100&sort=updatedAt,desc",
        ),
      ]);
      setPage(nextPlans);
      setRoadmaps(nextRoadmaps.content);
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, show]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading) return <PageLoading label="Đang tải lịch sử kế hoạch…" />;

  const todayDateString = todayIso(profile?.profile?.timeZone);
  const todayPlan = page?.content.find((p) => p.planDate === todayDateString);

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight">Kế hoạch học tập theo ngày</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý nhiệm vụ trực quan trên bảng Kanban: Chưa hoàn thành, Đang thực hiện, Hoàn thành.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {todayPlan && (
            <Link
              href={`/daily-plans/${todayPlan.id}`}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-50 px-4 text-xs font-black text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
            >
              Mở hôm nay
            </Link>
          )}
          <Button variant="success" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Tạo ngày mới
          </Button>
        </div>
      </Card>

      {(page?.content.length ?? 0) === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có kế hoạch ngày"
          description="Chọn ngày, quỹ thời gian và bắt đầu thêm các nhiệm vụ học tập thủ công."
          action={
            <Button variant="success" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Tạo kế hoạch đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(page?.content ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
      {page && page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page.first}
            onClick={() => setPageNumber((current) => current - 1)}
          >
            Trang trước
          </Button>
          <span className="text-xs font-bold text-slate-500">
            Trang {page.page + 1}/{page.totalPages} · {page.totalElements} kế hoạch
          </span>
          <Button
            variant="secondary"
            disabled={page.last}
            onClick={() => setPageNumber((current) => current + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}

      <CreatePlanModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          await load();
        }}
        roadmaps={roadmaps}
        timeZone={profile?.profile?.timeZone}
        defaultMinutes={profile?.profile?.defaultDailyMinutes ?? 60}
      />
    </div>
  );
}

function PlanCard({ plan }: { plan: DailyPlanSummary }) {
  const tone =
    plan.status === "COMPLETED"
      ? "emerald"
      : plan.status === "IN_PROGRESS"
        ? "indigo"
        : plan.status === "CANCELLED"
          ? "rose"
          : "slate";
  return (
    <Link href={`/daily-plans/${plan.id}`} className="group">
      <Card className="p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              <span className="text-lg font-black">{plan.planDate.slice(-2)}</span>
            </span>
            <div>
              <h3 className="text-base font-black">
                {formatDateOnly(plan.planDate, {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{plan.timeZoneSnapshot}</p>
            </div>
          </div>
          <Badge tone={tone}>{dailyPlanStatusLabels[plan.status]}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
          <span>
            <Clock3 className="mb-1 size-3.5 text-slate-400" />
            <strong>
              {plan.totalPlannedMinutes}/{plan.availableMinutes} phút
            </strong>
          </span>
          <span>
            <CheckCircle2 className="mb-1 size-3.5 text-slate-400" />
            <strong>
              {plan.completedItemsCount}/{plan.totalItemsCount} task
            </strong>
          </span>
          <span className="text-right">
            <strong className="text-lg text-indigo-700">{plan.completionPercentage}%</strong>
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={plan.completionPercentage} />
        </div>
        <div className="mt-4 flex justify-end">
          <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">
            Mở kế hoạch <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

