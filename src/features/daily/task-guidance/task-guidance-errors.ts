import { ApiClientError, getErrorMessage } from "@/lib/api-client";

const taskGuidanceErrorMessages: Record<string, string> = {
  RESOURCE_NOT_FOUND: "Nhiệm vụ không còn tồn tại hoặc không thuộc kế hoạch này.",
  TASK_GUIDANCE_NOT_FOUND: "Nhiệm vụ chưa có hướng dẫn AI.",
  TASK_GUIDANCE_ALREADY_RUNNING: "AI đang tạo hướng dẫn cho nhiệm vụ này.",
  TASK_GUIDANCE_CONTEXT_STALE:
    "Checklist đã thay đổi. Hãy tạo lại hướng dẫn theo các bước hiện tại.",
  TASK_GUIDANCE_INVALID_REFERENCE: "AI trả về một tài liệu tham khảo không hợp lệ.",
  AI_PROVIDER_NOT_CONFIGURED: "Chưa có nhà cung cấp AI cho tính năng hướng dẫn nhiệm vụ.",
  AI_PROVIDER_UNAVAILABLE: "Nhà cung cấp AI hiện không phản hồi. Bạn có thể thử lại sau.",
  AI_OUTPUT_INVALID: "AI chưa tạo được hướng dẫn hợp lệ. Không có nội dung dở dang được lưu.",
  AI_GENERATION_FAILED: "AI không thể hoàn tất hướng dẫn cho nhiệm vụ này.",
  CONFLICT: "Dữ liệu hướng dẫn vừa được thay đổi. Hãy tải lại trạng thái mới nhất.",
  ACCESS_DENIED: "Bạn không có quyền truy cập hướng dẫn của nhiệm vụ này.",
};

export function getTaskGuidanceErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return taskGuidanceErrorMessages[error.details.code] ?? getErrorMessage(error);
  }

  return getErrorMessage(error);
}

export function getTaskGuidanceFailureMessage(code?: string) {
  if (!code) return "AI không thể hoàn tất hướng dẫn cho nhiệm vụ này.";
  return taskGuidanceErrorMessages[code] ?? "AI không thể hoàn tất hướng dẫn cho nhiệm vụ này.";
}

export function isMissingTaskGuidance(error: unknown) {
  return (
    error instanceof ApiClientError &&
    ["TASK_GUIDANCE_NOT_FOUND", "AI_EXECUTION_NOT_FOUND"].includes(error.details.code)
  );
}
