import { apiRequest } from "@/lib/api-client";
import type { Roadmap, RoadmapItem, RoadmapItemType, RoadmapProgress } from "@/types/api";

export interface RoadmapItemInput {
  title: string;
  description: string;
  orderIndex: number;
  estimatedMinutes?: number;
}

export const roadmapApi = {
  get: (roadmapId: string) => apiRequest<Roadmap>(`/api/v1/roadmaps/${roadmapId}`),

  getProgress: (roadmapId: string) =>
    apiRequest<RoadmapProgress>(`/api/v1/roadmaps/${roadmapId}/progress`),

  createLearningUnit: (
    roadmapId: string,
    versionId: string,
    topicId: string,
    input: RoadmapItemInput,
  ) =>
    apiRequest<RoadmapItem>(
      `/api/v1/roadmaps/${roadmapId}/versions/${versionId}/topics/${topicId}/learning-units`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  updateItem: (roadmapId: string, versionId: string, itemId: string, input: RoadmapItemInput) =>
    apiRequest<RoadmapItem>(`/api/v1/roadmaps/${roadmapId}/versions/${versionId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteItem: (roadmapId: string, versionId: string, itemId: string) =>
    apiRequest<void>(`/api/v1/roadmaps/${roadmapId}/versions/${versionId}/items/${itemId}`, {
      method: "DELETE",
    }),

  createEditableCopy: (roadmapId: string) =>
    apiRequest<Roadmap>(`/api/v1/roadmaps/${roadmapId}/copy`, {
      method: "POST",
    }),
};

export function itemTypeLabel(itemType: RoadmapItemType) {
  switch (itemType) {
    case "MILESTONE":
      return "cột mốc";
    case "TOPIC":
      return "chủ đề";
    case "LEARNING_UNIT":
      return "đơn vị học";
  }
}
