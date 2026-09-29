"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/states";
import { dailyPlanStatusLabels } from "@/lib/display-labels";
import { formatDateOnly, todayIso } from "@/lib/format";
import { dailyPlanApi } from "./daily-plan-api";
import { CreatePlanModal } from "./create-plan-modal";
import type { DailyPlanSummary, PageResponse } from "@/types/api";

export interface DailyPlansHistoryStripProps {
  currentPlanId?: string;
  currentPlanDate?: string;
  onCreateNewDay?: () => void;
  timeZone?: string;
}

export function DailyPlansHistoryStrip({
  currentPlanId,
  currentPlanDate,
  onCreateNewDay,
  timeZone,
}: DailyPlansHistoryStripProps = {}) {
  const router = useRouter();
  const [plansPage, setPlansPage] = useState<PageResponse<DailyPlanSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadPlans = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await dailyPlanApi.getUserDailyPlans(page, 8);
      setPlansPage(response);
    } catch {
      // Ignore or let parent handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans(pageNumber);
  }, [loadPlans, pageNumber]);

  function handleCreateClick() {
    if (onCreateNewDay) {
      onCreateNewDay();
    } else {
      setCreateModalOpen(true);
    }
  }

  const plans = plansPage?.content ?? [];
  const todayDateString = todayIso(timeZone);

  // Quick stats for today
  const todayPlan = plans.find((p) => p.planDate === todayDateString);

  return (
    <div className="space-y-4 pt-2">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700 shadow-xs">
              <CalendarDays className="size-4" />
            </span>
            <h3 className="text-base font-black text-slate-900">
              Lịch sử & Thống kê theo ngày
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Xem lại hôm nay và các ngày trước đã hoàn thành những gì, hoặc chuyển nhanh giữa các ngày.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plansPage && plansPage.totalPages > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={plansPage.first || loading}
                onClick={() => setPageNumber((c) => Math.max(0, c - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-[11px] font-bold text-slate-500 px-1">
                {plansPage.page + 1}/{plansPage.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={plansPage.last || loading}
                onClick={() => setPageNumber((c) => c + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}

          <Button variant="success" size="sm" onClick={handleCreateClick}>
            <Plus className="size-3.5" />
            Tạo ngày mới
          </Button>
        </div>
      </div>

      {/* Summary highlight banner if today plan exists */}
      {todayPlan && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Sparkles className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                    Thống kê hôm nay ({formatDateOnly(todayPlan.planDate, { day: "2-digit", month: "2-digit", year: "numeric" })})
                  </span>
                  {currentPlanDate === todayPlan.planDate && (
                    <Badge tone="indigo" className="text-[10px]">
                      Đang mở trên bảng
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  Đã hoàn thành <strong>{todayPlan.completedItemsCount}/{todayPlan.totalItemsCount}</strong> nhiệm vụ
                  {" · "}
                  Thời lượng dự kiến <strong>{todayPlan.totalPlannedMinutes}/{todayPlan.availableMinutes}</strong> phút
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-28 text-right sm:w-36">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500">Tiến độ</span>
                  <span className="text-indigo-700">{todayPlan.completionPercentage}%</span>
                </div>
                <ProgressBar value={todayPlan.completionPercentage} />
              </div>
              {currentPlanId !== todayPlan.id && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push(`/daily-plans/${todayPlan.id}`)}
                >
                  Mở hôm nay
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Days Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Quick Add Day Card */}
        <button
          type="button"
          onClick={handleCreateClick}
          className="focus-ring flex min-h-[170px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600 group"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition group-hover:bg-indigo-600 group-hover:text-white shadow-xs">
            <Plus className="size-5" />
          </span>
          <strong className="mt-3 block text-xs font-black text-slate-800 group-hover:text-indigo-700">
            Tạo kế hoạch ngày mới
          </strong>
          <span className="mt-1 block text-[11px] text-slate-400">
            Lập kế hoạch cho ngày mai hoặc chọn ngày cụ thể
          </span>
        </button>

        {/* Existing Days Cards */}
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isToday = plan.planDate === todayDateString;
          const tone =
            plan.status === "COMPLETED"
              ? "emerald"
              : plan.status === "IN_PROGRESS"
                ? "indigo"
                : plan.status === "CANCELLED"
                  ? "rose"
                  : "slate";

          return (
            <Card
              key={plan.id}
              onClick={() => {
                if (!isCurrent) router.push(`/daily-plans/${plan.id}`);
              }}
              className={`relative flex min-h-[170px] flex-col justify-between p-4 transition-all duration-200 ${
                isCurrent
                  ? "border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-md"
                  : "cursor-pointer hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-9 place-items-center rounded-xl text-xs font-black shadow-xs ${
                        isCurrent
                          ? "bg-indigo-600 text-white"
                          : isToday
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {plan.planDate.slice(-2)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs font-black text-slate-900">
                          {isToday
                            ? "Hôm nay"
                            : formatDateOnly(plan.planDate, { weekday: "short", day: "2-digit", month: "2-digit" })}
                        </strong>
                        {isCurrent && (
                          <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-700">
                            Đang xem
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400">
                        {formatDateOnly(plan.planDate, { year: "numeric", month: "2-digit", day: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <Badge tone={tone} className="text-[10px]">
                    {dailyPlanStatusLabels[plan.status]}
                  </Badge>
                </div>

                {/* Day stats */}
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <CheckCircle2 className="size-3 text-slate-400" />
                    <strong>{plan.completedItemsCount}/{plan.totalItemsCount}</strong> task
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 font-semibold justify-end">
                    <Clock3 className="size-3 text-slate-400" />
                    <strong>{plan.totalPlannedMinutes}</strong>p
                  </span>
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                  <span className="text-slate-400">Hoàn thành</span>
                  <span className="text-indigo-700 font-black">{plan.completionPercentage}%</span>
                </div>
                <ProgressBar value={plan.completionPercentage} />

                <div className="mt-2.5 flex items-center justify-between pt-1">
                  {isCurrent ? (
                    <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      Đang hiển thị trên bảng
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-indigo-600 flex items-center gap-1">
                      Xem kế hoạch <ExternalLink className="size-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <CreatePlanModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={async () => {
          setCreateModalOpen(false);
          await loadPlans(0);
        }}
        timeZone={timeZone}
      />
    </div>
  );
}
