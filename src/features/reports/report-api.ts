import { apiRequest } from "@/lib/api-client";
import type { DashboardReport, KnowledgeMapResponse, WeakTopicTimelineItem } from "@/types/api";

export async function fetchDashboardReport(): Promise<DashboardReport> {
  return apiRequest<DashboardReport>("/api/v1/reports/dashboard");
}

export async function fetchKnowledgeMap(roadmapId?: string): Promise<KnowledgeMapResponse> {
  const query = roadmapId ? `?roadmapId=${encodeURIComponent(roadmapId)}` : "";
  return apiRequest<KnowledgeMapResponse>(`/api/v1/reports/knowledge-map${query}`);
}

export async function fetchWeakTopicsTimeline(roadmapId?: string): Promise<WeakTopicTimelineItem[]> {
  const query = roadmapId ? `?roadmapId=${encodeURIComponent(roadmapId)}` : "";
  return apiRequest<WeakTopicTimelineItem[]>(`/api/v1/reports/weak-topics-timeline${query}`);
}
