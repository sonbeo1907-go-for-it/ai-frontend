"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { History, RefreshCw, AlertCircle, BookOpen, Target } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { KnowledgeMapView } from "@/features/reports/knowledge-map/knowledge-map-view";
import { ReportSkeleton } from "@/features/reports/knowledge-map/report-skeleton";
import { useLazyReports, type ReportTab } from "@/features/reports/knowledge-map/use-lazy-reports";
import type { RoadmapSummary, PageResponse } from "@/types/api";

const WeakTopicsTimelineView = dynamic(
  () =>
    import("@/features/reports/knowledge-map/weak-topics-timeline-view").then(
      (module) => module.WeakTopicsTimelineView,
    ),
  { loading: () => <ReportSkeleton label="Đang tải nhật ký điểm yếu..." /> },
);

export default function KnowledgeMapPage() {
  const { profile } = useAuth();
  return <KnowledgeMapContent key={profile?.id ?? "anonymous"} />;
}

function KnowledgeMapContent() {
  const [activeTab, setActiveTab] = useState<ReportTab>("KNOWLEDGE_MAP");
  const [timelineOpened, setTimelineOpened] = useState(false);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [roadmapsLoading, setRoadmapsLoading] = useState(true);
  const [roadmapsError, setRoadmapsError] = useState("");
  const [roadmapsAttempt, setRoadmapsAttempt] = useState(0);
  const reports = useLazyReports(activeTab, selectedRoadmapId);

  useEffect(() => {
    const controller = new AbortController();
    // Defer startup so Strict Mode's setup/cleanup cycle does not duplicate this request.
    const timer = setTimeout(async () => {
      setRoadmapsLoading(true);
      setRoadmapsError("");
      try {
        const response = await apiRequest<PageResponse<RoadmapSummary>>(
          "/api/v1/roadmaps?page=0&size=50",
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setRoadmaps(response.content);
      } catch (error) {
        if (!controller.signal.aborted) setRoadmapsError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setRoadmapsLoading(false);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [roadmapsAttempt]);

  const mapData = reports.map.data;
  const timeline = reports.timeline.data;
  const hasCurrentData = activeTab === "KNOWLEDGE_MAP" ? mapData !== null : timeline !== null;
  const loadingLabel =
    activeTab === "KNOWLEDGE_MAP" ? "Đang tải tiến độ mục tiêu..." : "Đang tải nhật ký điểm yếu...";
  const scopeKey = selectedRoadmapId || mapData?.roadmapId || "default";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Thống kê học tập" className="flex flex-wrap">
          <button
            type="button"
            role="tab"
            id="knowledge-map-tab"
            aria-selected={activeTab === "KNOWLEDGE_MAP"}
            aria-controls="knowledge-map-panel"
            onClick={() => setActiveTab("KNOWLEDGE_MAP")}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "KNOWLEDGE_MAP"
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Target className="size-4" />
            Tiến độ mục tiêu
            {mapData && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {mapData.masteredTopics}/{mapData.totalTopics}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            id="weak-topics-tab"
            aria-selected={activeTab === "WEAK_TOPICS"}
            aria-controls="weak-topics-panel"
            onClick={() => {
              setTimelineOpened(true);
              setActiveTab("WEAK_TOPICS");
            }}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "WEAK_TOPICS"
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="size-4" />
            Nhật ký Điểm yếu (Timeline)
            {timeline && timeline.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {timeline.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
          <label className="flex min-w-0 items-center gap-2">
            <BookOpen className="size-4 shrink-0 text-slate-400" />
            <span className="sr-only">Chọn lộ trình</span>
            <select
              value={selectedRoadmapId}
              onChange={(event) => setSelectedRoadmapId(event.target.value)}
              aria-busy={roadmapsLoading}
              className="min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:max-w-64"
            >
              <option value="">Lộ trình hiện tại / Mặc định</option>
              {roadmaps.map((roadmap) => (
                <option key={roadmap.id} value={roadmap.id}>
                  {roadmap.title} {roadmap.status === "ACTIVE" ? "(Đang học)" : ""}
                </option>
              ))}
            </select>
          </label>
          {roadmapsLoading && <span className="text-xs text-slate-500">Đang tải lộ trình...</span>}
          {roadmapsError && (
            <button
              type="button"
              onClick={() => setRoadmapsAttempt((attempt) => attempt + 1)}
              className="text-xs font-semibold text-rose-700"
            >
              Thử tải lại danh sách lộ trình
            </button>
          )}
          <button
            type="button"
            onClick={reports.refresh}
            disabled={reports.loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`size-3.5 ${reports.loading ? "animate-spin text-emerald-600" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {reports.error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
            <AlertCircle className="size-5" />
            {hasCurrentData ? "Không thể cập nhật dữ liệu" : "Không thể tải dữ liệu"}
          </div>
          <p className="mt-1 text-xs text-rose-600">{reports.error}</p>
          <button
            type="button"
            onClick={reports.refresh}
            className="mt-3 text-xs font-bold text-rose-700"
          >
            Thử lại
          </button>
        </div>
      )}
      {reports.loading && hasCurrentData && (
        <p role="status" className="text-xs text-slate-500">
          Đang cập nhật dữ liệu...
        </p>
      )}

      <section
        role="tabpanel"
        id="knowledge-map-panel"
        aria-labelledby="knowledge-map-tab"
        hidden={activeTab !== "KNOWLEDGE_MAP"}
        aria-busy={activeTab === "KNOWLEDGE_MAP" && reports.loading}
      >
        {mapData && <KnowledgeMapView key={scopeKey} data={mapData} />}
        {activeTab === "KNOWLEDGE_MAP" && !mapData && reports.loading && (
          <ReportSkeleton label={loadingLabel} />
        )}
      </section>
      <section
        role="tabpanel"
        id="weak-topics-panel"
        aria-labelledby="weak-topics-tab"
        hidden={activeTab !== "WEAK_TOPICS"}
        aria-busy={activeTab === "WEAK_TOPICS" && reports.loading}
      >
        {timelineOpened && timeline && (
          <WeakTopicsTimelineView key={scopeKey} timeline={timeline} />
        )}
        {activeTab === "WEAK_TOPICS" && !timeline && reports.loading && (
          <ReportSkeleton label={loadingLabel} />
        )}
      </section>
    </div>
  );
}
