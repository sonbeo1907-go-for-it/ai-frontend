"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  History,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { WeakTopicTimelineItem } from "@/types/api";

type TimelineFilter = "ALL" | "MASTERED_ONLY" | "UNRESOLVED_ONLY";

export function WeakTopicsTimelineView({
  timeline,
}: {
  timeline: WeakTopicTimelineItem[];
}) {
  const [filter, setFilter] = useState<TimelineFilter>("ALL");

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = timeline.length;
    const mastered = timeline.filter((t) => t.status === "MASTERED");
    const inReview = timeline.filter((t) => t.status === "IN_REVIEW");
    const unresolved = timeline.filter((t) => t.status === "UNRESOLVED");

    const daysSum = mastered.reduce((acc, curr) => acc + (curr.daysToMaster ?? 0), 0);
    const avgDays = mastered.length > 0 ? (daysSum / mastered.length).toFixed(1) : "0";

    return {
      total,
      masteredCount: mastered.length,
      inReviewCount: inReview.length,
      unresolvedCount: unresolved.length,
      avgDays,
    };
  }, [timeline]);

  // Filter and sort items (Mastered / newest first)
  const filteredItems = useMemo(() => {
    let items = [...timeline];
    if (filter === "MASTERED_ONLY") {
      items = items.filter((t) => t.status === "MASTERED");
    } else if (filter === "UNRESOLVED_ONLY") {
      items = items.filter((t) => t.status !== "MASTERED");
    }

    // Sort by masteredAt desc if mastered, or unresolvedAt desc
    return items.sort((a, b) => {
      const dateA = a.masteredAt ? new Date(a.masteredAt).getTime() : new Date(a.unresolvedAt).getTime();
      const dateB = b.masteredAt ? new Date(b.masteredAt).getTime() : new Date(b.unresolvedAt).getTime();
      return dateB - dateA;
    });
  }, [timeline, filter]);

  return (
    <div className="space-y-6">
      {/* 1. ACHIEVEMENT SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-200">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900/70">Đã vượt qua thành công</p>
              <p className="text-2xl font-black text-emerald-700">{stats.masteredCount}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Sparkles className="size-3" /> Biến điểm yếu thành điểm mạnh
          </p>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Thời gian vượt qua TB</p>
              <p className="text-2xl font-black text-slate-900">
                {stats.avgDays} <span className="text-sm font-normal text-slate-400">ngày</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Tính từ lúc phát hiện đến khi đạt chuẩn
          </p>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <History className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Đang trong tiến trình ôn</p>
              <p className="text-2xl font-black text-slate-900">
                {stats.inReviewCount} <span className="text-sm font-normal text-slate-400">chủ đề</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Đã được đưa vào kế hoạch ôn luyện
          </p>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Chờ khắc phục</p>
              <p className="text-2xl font-black text-slate-900">
                {stats.unresolvedCount} <span className="text-sm font-normal text-slate-400">chủ đề</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Cần làm thêm bài tập hoặc tự học lại
          </p>
        </Card>
      </div>

      {/* 2. FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Lọc dòng thời gian:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({timeline.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("MASTERED_ONLY")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "MASTERED_ONLY"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <Trophy className="size-3.5" />
              Đã vượt qua ({stats.masteredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("UNRESOLVED_ONLY")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === "UNRESOLVED_ONLY"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              Đang khắc phục ({stats.inReviewCount + stats.unresolvedCount})
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Sắp xếp theo mốc thời gian gần nhất
        </p>
      </div>

      {/* 3. TIMELINE FEED */}
      {filteredItems.length === 0 ? (
        <Card className="border-dashed border-slate-200 p-12 text-center">
          <ShieldCheck className="mx-auto size-12 text-emerald-400" />
          <h4 className="mt-3 text-base font-bold text-slate-800">
            {filter === "MASTERED_ONLY"
              ? "Chưa có điểm yếu nào được hoàn thành khắc phục"
              : "Không có ghi nhận điểm yếu nào"}
          </h4>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {filter === "MASTERED_ONLY"
              ? "Hãy tiếp tục hoàn thành các bài ôn tập và bài kiểm tra để đánh dấu mốc chiến thắng điểm yếu đầu tiên!"
              : "Tuyệt vời! Bạn đang duy trì tiến độ học tập xuất sắc mà không gặp điểm yếu nào tồn đọng."}
          </p>
        </Card>
      ) : (
        <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          <div className="space-y-6">
            {filteredItems.map((item) => {
              const isMastered = item.status === "MASTERED";

              return (
                <div key={item.weakTopicId} className="relative group">
                  {/* Timeline Indicator Node */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-4 flex size-6 sm:size-8 items-center justify-center rounded-full border-2 bg-white transition shadow-sm ${
                      isMastered
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100"
                        : item.status === "IN_REVIEW"
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50"
                        : "border-amber-400 bg-amber-50 text-amber-600 ring-4 ring-amber-50"
                    }`}
                  >
                    {isMastered ? (
                      <Trophy className="size-3 sm:size-4" />
                    ) : item.status === "IN_REVIEW" ? (
                      <History className="size-3 sm:size-4" />
                    ) : (
                      <AlertCircle className="size-3 sm:size-4" />
                    )}
                  </div>

                  {/* Timeline Item Content Card */}
                  <Card
                    className={`overflow-hidden transition ${
                      isMastered
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm hover:border-emerald-300"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Top banner for conquered topics */}
                    {isMastered && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span>Đã vượt qua & Làm chủ thành công</span>
                        </div>

                        {item.daysToMaster != null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-2 py-0.5 font-bold text-emerald-900 text-[11px]">
                            <Flame className="size-3 text-emerald-700" />
                            {item.daysToMaster === 0
                              ? "Chinh phục ngay trong ngày"
                              : `Vượt qua sau ${item.daysToMaster} ngày nỗ lực`}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4 sm:p-5">
                      {/* Breadcrumbs & Title */}
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {item.milestoneTitle && (
                            <>
                              <span className="font-medium text-slate-600">
                                {item.milestoneTitle}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          {item.topicTitle && (
                            <>
                              <span className="font-medium text-slate-600">{item.topicTitle}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="text-slate-400">{item.roadmapTitle}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                          <h4 className="text-base font-bold text-slate-900">
                            {item.learningUnitTitle}
                          </h4>

                          {isMastered ? (
                            <Badge
                              tone="emerald"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                            >
                              MASTERED
                            </Badge>
                          ) : item.status === "IN_REVIEW" ? (
                            <Badge tone="indigo">ĐANG ÔN LUYỆN</Badge>
                          ) : (
                            <Badge tone="amber">CẦN KHẮC PHỤC</Badge>
                          )}
                        </div>
                      </div>

                      {/* Detail: Dates & Diagnosis */}
                      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50/80 p-3 sm:grid-cols-2 text-xs border border-slate-100">
                        <div>
                          <p className="font-semibold text-slate-500">Mốc thời gian:</p>
                          <ul className="mt-1.5 space-y-1 text-slate-700">
                            <li className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-slate-400" />
                              <span>Phát hiện điểm yếu:</span>
                              <strong>{formatDate(item.unresolvedAt)}</strong>
                            </li>
                            {item.masteredAt && (
                              <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Trophy className="size-3.5 text-emerald-600" />
                                <span>Chinh phục ngày:</span>
                                <strong>{formatDate(item.masteredAt)}</strong>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-500">Nguyên nhân kích hoạt:</p>
                          <p className="mt-1.5 text-slate-700">
                            {item.triggerSource === "QUIZ_FAILED" ? (
                              <span>
                                Bài kiểm tra không đạt
                                {item.lastQuizScore != null && (
                                  <strong className="text-rose-600 ml-1">
                                    ({item.lastQuizScore}%)
                                  </strong>
                                )}
                              </span>
                            ) : item.triggerSource === "LOW_RATING" ? (
                              <span>
                                Tự đánh giá mức độ hiểu chưa cao
                                {item.lastUnderstandingRating != null && (
                                  <strong className="text-amber-600 ml-1">
                                    ({item.lastUnderstandingRating}/5 sao)
                                  </strong>
                                )}
                              </span>
                            ) : (
                              <span>Cả bài kiểm tra và tự đánh giá đều cần củng cố</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
