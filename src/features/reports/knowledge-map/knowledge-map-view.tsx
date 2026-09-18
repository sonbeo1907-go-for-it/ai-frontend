"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
  Search,
  Filter,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeMapResponse } from "@/types/api";

type FilterStatus = "ALL" | "MASTERED" | "IN_PROGRESS";

export function KnowledgeMapView({
  data,
}: {
  data: KnowledgeMapResponse;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filter milestones, topics and units based on search query and status filter
  const filteredMilestones = useMemo(() => {
    if (!data.milestones) return [];

    return data.milestones
      .map((milestone) => {
        const filteredTopics = milestone.topics.filter((topic) => {
          // Status filter
          if (filterStatus === "MASTERED" && !topic.mastered) return false;
          if (filterStatus === "IN_PROGRESS" && (topic.mastered || topic.status === "NOT_STARTED"))
            return false;

          // Search query filter
          if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            const matchesTopic =
              topic.title.toLowerCase().includes(query) ||
              (topic.description && topic.description.toLowerCase().includes(query));
            const matchesUnit = topic.learningUnits.some(
              (u) =>
                u.title.toLowerCase().includes(query) ||
                (u.description && u.description.toLowerCase().includes(query)),
            );
            return matchesTopic || matchesUnit;
          }
          return true;
        });

        return {
          ...milestone,
          topics: filteredTopics,
        };
      })
      .filter((milestone) => milestone.topics.length > 0 || searchQuery.trim() === "");
  }, [data.milestones, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. MASTERY SUMMARY STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-200">
              <Brain className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900/70">Mức độ làm chủ</p>
              <p className="text-2xl font-black text-emerald-800">
                {data.masteryPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div
              className="h-2 overflow-hidden rounded-full bg-emerald-100"
              role="progressbar"
              aria-label="Tiến độ làm chủ"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.max(0, Math.min(100, data.masteryPercentage))}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, data.masteryPercentage))}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Chủ đề đã làm chủ</p>
              <p className="text-2xl font-black text-slate-900">
                <span className="text-emerald-600">{data.masteredTopics}</span>
                <span className="text-sm font-normal text-slate-400"> / {data.totalTopics}</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Đạt 100% các đơn vị học tập thành công
          </p>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Đơn vị học tập (Units)</p>
              <p className="text-2xl font-black text-slate-900">
                <span className="text-teal-600">{data.masteredLearningUnits}</span>
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  / {data.totalLearningUnits}
                </span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Gồm các bài học hoàn thành & điểm yếu đã vượt qua
          </p>
        </Card>

        <Card className="border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Cột mốc Lộ trình</p>
              <p className="text-2xl font-black text-slate-900">{data.totalMilestones}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 truncate" title={data.roadmapTitle ?? ""}>
            {data.roadmapTitle || "Chưa chọn lộ trình"}
          </p>
        </Card>
      </div>

      {/* 2. CONTROLS: SEARCH & FILTER */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm chủ đề hoặc bài học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="size-3.5" /> Lọc:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({data.totalTopics})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("MASTERED")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === "MASTERED"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            Đã làm chủ ({data.masteredTopics})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("IN_PROGRESS")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === "IN_PROGRESS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            }`}
          >
            Đang tiến hành ({data.totalTopics - data.masteredTopics})
          </button>
        </div>
      </div>

      {/* 3. KNOWLEDGE MAP HIERARCHICAL TREE */}
      {filteredMilestones.length === 0 ? (
        <Card className="border-dashed border-slate-200 p-12 text-center">
          <Brain className="mx-auto size-12 text-slate-300" />
          <h4 className="mt-3 text-base font-bold text-slate-800">Không tìm thấy chủ đề nào</h4>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery
              ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc."
              : "Lộ trình hiện tại chưa có thông tin chủ đề tri thức."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMilestones.map((milestone, mIndex) => {
            const isMilestoneExpanded = expandedMilestones[milestone.id] !== false; // default expanded

            const milestoneTopicsMastered = milestone.topics.filter((t) => t.mastered).length;
            const milestoneTopicsTotal = milestone.topics.length;
            const isAllMilestoneMastered =
              milestoneTopicsTotal > 0 && milestoneTopicsMastered === milestoneTopicsTotal;

            return (
              <div
                key={milestone.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
              >
                {/* Milestone Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleMilestone(milestone.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleMilestone(milestone.id);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-4 p-5 transition ${
                    isAllMilestoneMastered
                      ? "bg-gradient-to-r from-emerald-50/50 to-teal-50/20"
                      : "bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-600 shadow-sm border border-slate-200">
                      M{mIndex + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{milestone.title}</h4>
                        {isAllMilestoneMastered && (
                          <Badge
                            tone="emerald"
                            className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                          >
                            <CheckCircle2 className="mr-1 size-3" /> CHINH PHỤC CỘT MỐC
                          </Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span>
                        <strong className="text-emerald-700">{milestoneTopicsMastered}</strong> /{" "}
                        {milestoneTopicsTotal} chủ đề
                      </span>
                    </div>
                    {isMilestoneExpanded ? (
                      <ChevronDown className="size-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="size-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Milestone Topics List */}
                {isMilestoneExpanded && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100 p-3 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      {milestone.topics.map((topic) => {
                        const isTopicExpanded = !!expandedTopics[topic.id];
                        const masteredUnitsCount = topic.learningUnits.filter(
                          (u) => u.mastered,
                        ).length;
                        const totalUnitsCount = topic.learningUnits.length;

                        return (
                          <div
                            key={topic.id}
                            className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                              topic.mastered
                                ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-emerald-50/30 to-white shadow-sm shadow-emerald-100"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div>
                              {/* Topic Header with MASTERED highlight */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5
                                      className={`text-sm font-bold ${
                                        topic.mastered ? "text-emerald-950" : "text-slate-900"
                                      }`}
                                    >
                                      {topic.title}
                                    </h5>
                                  </div>
                                  {topic.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                      {topic.description}
                                    </p>
                                  )}
                                </div>

                                {topic.mastered ? (
                                  <span
                                    title="Chủ đề này đã được chinh phục hoàn toàn!"
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-500 px-2.5 py-1 text-[11px] font-black tracking-wider text-white shadow-sm shadow-emerald-200"
                                  >
                                    <CheckCircle2 className="size-3.5" /> MASTERED
                                  </span>
                                ) : topic.completionPercentage > 0 ? (
                                  <Badge tone="indigo">
                                    Đang học ({topic.completionPercentage}%)
                                  </Badge>
                                ) : (
                                  <Badge tone="slate">Chưa học</Badge>
                                )}
                              </div>

                              {/* Progress bar for topic */}
                              <div className="mt-3">
                                <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                                  <span>Tiến độ bài học</span>
                                  <span>
                                    {masteredUnitsCount}/{totalUnitsCount} bài (
                                    {topic.completionPercentage}%)
                                  </span>
                                </div>
                                <div
                                  className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                                  role="progressbar"
                                  aria-label="Tiến độ bài học"
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={Math.max(0, Math.min(100, topic.completionPercentage))}
                                >
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      topic.mastered
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                        : "bg-gradient-to-r from-indigo-500 to-blue-500"
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(100, topic.completionPercentage))}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Learning Units Accordion Toggle */}
                            {topic.learningUnits.length > 0 && (
                              <div className="mt-4 border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTopic(topic.id)}
                                  className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900"
                                >
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="size-3.5 text-slate-400" />
                                    Xem {topic.learningUnits.length} đơn vị học tập (Units)
                                  </span>
                                  {isTopicExpanded ? (
                                    <ChevronDown className="size-4" />
                                  ) : (
                                    <ChevronRight className="size-4" />
                                  )}
                                </button>

                                {isTopicExpanded && (
                                  <div className="mt-2 space-y-1.5 pl-2">
                                    {topic.learningUnits.map((unit) => (
                                      <div
                                        key={unit.id}
                                        className={`flex items-center justify-between rounded-lg p-2 text-xs transition ${
                                          unit.mastered
                                            ? "bg-emerald-100/60 text-emerald-950 font-medium"
                                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          {unit.mastered ? (
                                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                          ) : (
                                            <div className="size-2 rounded-full bg-slate-300 ml-1 shrink-0" />
                                          )}
                                          <span className="truncate">{unit.title}</span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {unit.unresolvedWeakTopic && (
                                            <span
                                              title="Chủ đề từng là điểm yếu đang khắc phục"
                                              className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                                            >
                                              <AlertTriangle className="size-3" /> Cần ôn tập
                                            </span>
                                          )}
                                          {unit.mastered && (
                                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                              MASTERED
                                            </span>
                                          )}
                                          <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                            <Clock className="size-3" />
                                            {unit.estimatedMinutes}p
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
