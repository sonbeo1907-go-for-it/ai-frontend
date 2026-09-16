"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/states";
import type { DashboardReport, DailyStudyTimePoint } from "@/types/api";

export function DashboardStatsSection({ report }: { report: DashboardReport }) {
  const { masterPlan, streak, studyTime } = report;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Thống Kê Học Tập & Tiến Độ
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Duy trì thói quen mỗi ngày để chinh phục mục tiêu đã đề ra.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. STREAK COUNT CARD */}
        <StreakCard streak={streak} />

        {/* 2. MASTER PLAN PROGRESS CARD */}
        <MasterPlanCard masterPlan={masterPlan} />

        {/* 3. TOTAL STUDY HOURS CARD */}
        <StudyTimeSummaryCard studyTime={studyTime} />
      </div>

      {/* 4. 7-DAY STUDY TIME CHART */}
      <StudyTimeChartCard dailyPoints={studyTime.dailyPoints} />
    </section>
  );
}

function StreakCard({ streak }: { streak: DashboardReport["streak"] }) {
  const isFlameHot = streak.currentStreak > 0;

  return (
    <Card className="relative overflow-hidden border-orange-100 bg-gradient-to-br from-orange-50/70 via-amber-50/40 to-white p-6 shadow-sm">
      <div className="absolute -right-6 -top-6 size-28 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-300/20 blur-xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100/70 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-orange-800">
            <Flame className={`size-3.5 ${isFlameHot ? "text-orange-600 animate-pulse" : "text-slate-400"}`} />
            Chuỗi học tập
          </div>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {streak.currentStreak}{" "}
            <span className="text-base font-bold text-slate-600">ngày liên tục</span>
          </p>
        </div>

        <div
          className={`grid size-14 shrink-0 place-items-center rounded-2xl shadow-md ${
            isFlameHot
              ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-200"
              : "bg-slate-100 text-slate-400 shadow-slate-100"
          }`}
        >
          <Flame className={`size-8 ${isFlameHot ? "animate-bounce" : ""}`} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {streak.isActiveToday ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 border border-emerald-200/70">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>Hôm nay bạn đã hoàn thành nhiệm vụ và giữ vững chuỗi!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 border border-amber-200/70">
            <Sparkles className="size-4 shrink-0 text-amber-600" />
            <span>Hoàn thành ít nhất 1 task hôm nay để duy trì chuỗi nhé!</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-orange-100/80 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Award className="size-3.5 text-amber-500" />
            Kỷ lục dài nhất: <strong className="text-slate-700">{streak.longestStreak} ngày</strong>
          </span>
          <span className="text-[11px] text-slate-400 truncate max-w-[130px]" title={streak.timeZone}>
            {streak.timeZone}
          </span>
        </div>
      </div>
    </Card>
  );
}

function MasterPlanCard({ masterPlan }: { masterPlan: DashboardReport["masterPlan"] }) {
  if (!masterPlan) {
    return (
      <Card className="flex flex-col justify-between border-dashed border-slate-200 bg-slate-50/50 p-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-slate-600">
            <BookOpen className="size-3.5 text-slate-500" />
            Lộ trình chính
          </div>
          <h4 className="mt-3 text-lg font-bold text-slate-800">Chưa kích hoạt lộ trình</h4>
          <p className="mt-1 text-xs text-slate-500">
            Kích hoạt một lộ trình để bắt đầu theo dõi tiến độ tổng thể (% Master Plan).
          </p>
        </div>
        <Link
          href="/roadmaps"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          <BookOpen className="size-3.5" />
          Khám phá lộ trình
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-slate-50/30 to-white p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100/70 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-indigo-800">
            <BookOpen className="size-3.5 text-indigo-600" />
            Lộ trình chính
          </div>
          <span className="text-2xl font-black text-indigo-700">
            {Math.round(masterPlan.completionPercentage)}%
          </span>
        </div>

        <h4 className="mt-3 font-extrabold text-slate-900 line-clamp-1" title={masterPlan.title}>
          {masterPlan.title}
        </h4>

        <div className="mt-3">
          <ProgressBar value={masterPlan.completionPercentage} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-xs">
            <p className="text-slate-400 font-medium text-[11px]">Chủ đề (Topic)</p>
            <p className="mt-0.5 font-black text-slate-800">
              {masterPlan.completedTopics}/{masterPlan.totalTopics}
            </p>
          </div>
          <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-xs">
            <p className="text-slate-400 font-medium text-[11px]">Bài học (Unit)</p>
            <p className="mt-0.5 font-black text-slate-800">
              {masterPlan.completedLearningUnits}/{masterPlan.totalLearningUnits}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-indigo-100/80 pt-3">
        <Link
          href={`/roadmaps/${masterPlan.roadmapId}`}
          className="group inline-flex w-full items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          <span>Xem chi tiết lộ trình</span>
          <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
        </Link>
      </div>
    </Card>
  );
}

function StudyTimeSummaryCard({ studyTime }: { studyTime: DashboardReport["studyTime"] }) {
  return (
    <Card className="flex flex-col justify-between border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-white p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/70 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-emerald-800">
            <Clock className="size-3.5 text-emerald-600" />
            Thời gian tích lũy
          </div>
          <TrendingUp className="size-5 text-emerald-600" />
        </div>

        <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          {studyTime.totalStudyHours}{" "}
          <span className="text-base font-bold text-slate-600">giờ</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Tương đương {studyTime.totalStudyMinutes.toLocaleString()} phút học tập chăm chỉ
        </p>

        <div className="mt-4 rounded-2xl bg-white p-3.5 border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-700">Hiệu quả học tập</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Dữ liệu ghi nhận từ tất cả các buổi làm nhiệm vụ và phiên Pomodoro tập trung của bạn.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-emerald-100/80 pt-3 text-xs text-slate-400">
        Cập nhật theo thời gian thực từ tiến độ ngày
      </div>
    </Card>
  );
}

function StudyTimeChartCard({ dailyPoints }: { dailyPoints: DailyStudyTimePoint[] }) {
  const [selectedPoint, setSelectedPoint] = useState<DailyStudyTimePoint | null>(null);

  // Compute max minutes to scale chart height
  const maxMinutes = Math.max(
    60,
    ...dailyPoints.map((p) => p.studyMinutes),
    ...dailyPoints.map((p) => p.targetMinutes)
  );

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-base font-black tracking-tight text-slate-900">
            Biểu Đồ Thời Gian Học Tích Lũy (7 Ngày Gần Nhất)
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            So sánh thời gian học thực tế mỗi ngày với mục tiêu hàng ngày.
          </p>
        </div>
        {selectedPoint && (
          <Badge tone="indigo" className="self-start sm:self-auto text-xs py-1 px-3">
            {selectedPoint.date} ({selectedPoint.dayOfWeek}): {selectedPoint.studyMinutes} phút ·{" "}
            {selectedPoint.completedTasks} task xong
          </Badge>
        )}
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pb-2 border-b border-slate-200">
          {dailyPoints.map((point, index) => {
            const isToday = index === dailyPoints.length - 1;
            const heightPercent = Math.min(100, Math.round((point.studyMinutes / maxMinutes) * 100));
            const isTargetMet = point.studyMinutes >= point.targetMinutes && point.studyMinutes > 0;
            const hasStudied = point.studyMinutes > 0;

            return (
              <div
                key={point.date}
                className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                onMouseEnter={() => setSelectedPoint(point)}
                onClick={() => setSelectedPoint(point)}
              >
                {/* Floating Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-md">
                  {point.studyMinutes} phút
                </div>

                {/* Target marker line */}
                {point.targetMinutes > 0 && (
                  <div
                    className="absolute w-full border-t-2 border-dashed border-slate-300 opacity-40 pointer-events-none"
                    style={{
                      bottom: `${Math.min(100, Math.round((point.targetMinutes / maxMinutes) * 100))}%`,
                    }}
                    title={`Mục tiêu: ${point.targetMinutes} phút`}
                  />
                )}

                {/* The Bar */}
                <div
                  className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
                    isTargetMet
                      ? "bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300"
                      : hasStudied
                      ? "bg-gradient-to-t from-indigo-600 to-blue-400 group-hover:from-indigo-500 group-hover:to-blue-300"
                      : "bg-slate-100 group-hover:bg-slate-200"
                  } ${isToday ? "ring-2 ring-indigo-400 ring-offset-2" : ""}`}
                  style={{ height: `${Math.max(8, heightPercent)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-3 text-center">
          {dailyPoints.map((point, index) => {
            const isToday = index === dailyPoints.length - 1;
            return (
              <div key={point.date} className="text-center">
                <p
                  className={`text-xs font-black ${
                    isToday ? "text-indigo-600" : "text-slate-700"
                  }`}
                >
                  {point.dayOfWeek}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {point.date.slice(5)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              Đạt mục tiêu ngày
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-indigo-500" />
              Có thời gian học
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-slate-200" />
              Chưa học
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Đường gạch ngang: Mục tiêu ngày ({dailyPoints[0]?.targetMinutes ?? 60} phút)
          </span>
        </div>
      </div>
    </Card>
  );
}
