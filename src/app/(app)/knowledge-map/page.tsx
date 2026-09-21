"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  History,
  LoaderCircle,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { fetchKnowledgeMap, fetchWeakTopicsTimeline } from "@/features/reports/report-api";
import { KnowledgeMapView } from "@/features/reports/knowledge-map/knowledge-map-view";
import { WeakTopicsTimelineView } from "@/features/reports/knowledge-map/weak-topics-timeline-view";
import type {
  KnowledgeMapResponse,
  WeakTopicTimelineItem,
  RoadmapSummary,
  PageResponse,
} from "@/types/api";

type ActiveTab = "KNOWLEDGE_MAP" | "WEAK_TOPICS";

export default function KnowledgeMapPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("KNOWLEDGE_MAP");
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("");
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);

  const [mapData, setMapData] = useState<{
    data: KnowledgeMapResponse | null;
    loading: boolean;
    error: string;
  }>({
    data: null,
    loading: true,
    error: "",
  });

  const [timelineData, setTimelineData] = useState<{
    data: WeakTopicTimelineItem[];
    loading: boolean;
    error: string;
  }>({
    data: [],
    loading: true,
    error: "",
  });

  // Load available roadmaps for dropdown
  useEffect(() => {
    async function loadRoadmaps() {
      try {
        const response = await apiRequest<PageResponse<RoadmapSummary>>(
          "/api/v1/roadmaps?page=0&size=50",
        );
        if (response?.content) {
          setRoadmaps(response.content);
        }
      } catch {
        // Soft fail if roadmaps cannot be loaded
      }
    }
    loadRoadmaps();
  }, []);

  // Fetch Knowledge Map & Weak Topics Timeline
  const loadData = useCallback(async () => {
    await Promise.resolve();
    setMapData((prev) => ({ ...prev, loading: true, error: "" }));
    setTimelineData((prev) => ({ ...prev, loading: true, error: "" }));

    const rId = selectedRoadmapId || undefined;
    try {
      const [kMap, tLine] = await Promise.all([
        fetchKnowledgeMap(rId),
        fetchWeakTopicsTimeline(rId),
      ]);

      setMapData({ data: kMap, loading: false, error: "" });
      setTimelineData({ data: tLine, loading: false, error: "" });
      if (!selectedRoadmapId && kMap.roadmapId) {
        setSelectedRoadmapId(kMap.roadmapId);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setMapData((prev) => ({ ...prev, loading: false, error: msg }));
      setTimelineData((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }, [selectedRoadmapId]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(id);
  }, [loadData]);

  const isLoading = mapData.loading || timelineData.loading;
  const error = mapData.error || timelineData.error;

  return (
    <div className="space-y-6">
      {/* Header with Title and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Bản Đồ Trí Tuệ & Nhật Ký Điểm Yếu
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Xem lại danh sách nội dung đã làm chủ và hành trình bền bỉ vượt qua khó khăn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Roadmap Selector */}
          {roadmaps.length > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-slate-400" />
              <select
                value={selectedRoadmapId}
                onChange={(e) => setSelectedRoadmapId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Lộ trình hiện tại / Mặc định</option>
                {roadmaps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.status === "ACTIVE" ? "(Đang học)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("KNOWLEDGE_MAP")}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "KNOWLEDGE_MAP"
              ? "text-emerald-700 border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Brain className="size-4" />
          <span>Bản đồ Trí tuệ (Knowledge Map)</span>
          {mapData.data && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "KNOWLEDGE_MAP"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {mapData.data.masteredTopics}/{mapData.data.totalTopics}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WEAK_TOPICS")}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === "WEAK_TOPICS"
              ? "text-emerald-700 border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <History className="size-4" />
          <span>Nhật ký Điểm yếu (Timeline)</span>
          {timelineData.data.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "WEAK_TOPICS"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {timelineData.data.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <LoaderCircle className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Đang tải bản đồ tri thức...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto size-8 text-rose-500" />
          <h3 className="mt-2 text-sm font-bold text-rose-800">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            <RefreshCw className="size-3.5" />
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {activeTab === "KNOWLEDGE_MAP" && mapData.data && (
            <KnowledgeMapView data={mapData.data} />
          )}

          {activeTab === "WEAK_TOPICS" && (
            <WeakTopicsTimelineView timeline={timelineData.data} />
          )}
        </>
      )}
    </div>
  );
}
