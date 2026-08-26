import type { DailyPlanStatus, DailyTaskCategory, RoadmapStatus, VersionStatus } from "@/types/api";

export type VersionOrigin = "MANUAL" | "USER_EDITED" | "AI_GENERATED" | "AI_REGENERATED";

export const roadmapStatusLabels: Record<RoadmapStatus, string> = {
  ONBOARDING: "Đang thiết lập",
  DRAFT: "Bản nháp",
  ACTIVE: "Đang sử dụng",
  ARCHIVED: "Đã lưu trữ",
};

export const versionStatusLabels: Record<VersionStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang sử dụng",
  SUPERSEDED: "Phiên bản cũ",
};

export const versionOriginLabels: Record<VersionOrigin, string> = {
  MANUAL: "Tạo thủ công",
  USER_EDITED: "Người dùng chỉnh sửa",
  AI_GENERATED: "AI tạo",
  AI_REGENERATED: "AI tái tạo",
};

export const dailyPlanStatusLabels: Record<DailyPlanStatus, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

export const dailyTaskCategoryLabels: Record<DailyTaskCategory, string> = {
  REVIEW: "Ôn tập",
  NEW_MATERIAL: "Kiến thức mới",
  PRACTICE: "Thực hành",
  CUSTOM: "Tùy chỉnh",
};
