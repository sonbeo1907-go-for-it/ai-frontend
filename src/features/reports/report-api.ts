import { apiRequest } from "@/lib/api-client";
import type { DashboardReport, KnowledgeMapResponse, WeakTopicTimelineItem } from "@/types/api";

export async function fetchDashboardReport(roadmapId?: string): Promise<DashboardReport> {
  const query = roadmapId ? `?roadmapId=${encodeURIComponent(roadmapId)}` : "";
  return apiRequest<DashboardReport>(`/api/v1/reports/dashboard${query}`);
}

export async function fetchKnowledgeMap(
  roadmapId?: string,
  signal?: AbortSignal,
): Promise<KnowledgeMapResponse> {
  const query = roadmapId ? `?roadmapId=${encodeURIComponent(roadmapId)}` : "";
  return apiRequest<KnowledgeMapResponse>(`/api/v1/reports/knowledge-map${query}`, { signal });
}

export async function fetchWeakTopicsTimeline(
  roadmapId?: string,
  signal?: AbortSignal,
): Promise<WeakTopicTimelineItem[]> {
  const query = roadmapId ? `?roadmapId=${encodeURIComponent(roadmapId)}` : "";
  return apiRequest<WeakTopicTimelineItem[]>(`/api/v1/reports/weak-topics-timeline${query}`, {
    signal,
  });
}
