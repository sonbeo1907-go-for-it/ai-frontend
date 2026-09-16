import { ApiClientError, getErrorMessage } from "@/lib/api-client";

const taskStepErrorMessages: Record<string, string> = {
  RESOURCE_NOT_FOUND: "Bước thực hiện không còn tồn tại hoặc không thuộc kế hoạch này.",
  DAILY_PLAN_VERSION_NOT_EDITABLE:
    "Chỉ có thể chỉnh sửa bước thực hiện trong phiên bản kế hoạch DRAFT.",
  DAILY_PLAN_VERSION_NOT_ACTIVE:
    "Chỉ có thể đánh dấu bước trong phiên bản kế hoạch đang hoạt động.",
  TASK_STEP_INVALID: "Thông tin bước thực hiện chưa hợp lệ.",
  TASK_STEP_TIME_EXCEEDED: "Tổng thời gian của các bước vượt quá thời gian dự kiến của nhiệm vụ.",
  CONCURRENT_MODIFICATION:
    "Dữ liệu vừa được thay đổi ở nơi khác. Danh sách mới nhất đã được tải lại.",
  DAILY_PLAN_LOCKED: "Nhiệm vụ đã có kết quả cuối cùng nên checklist không thể thay đổi.",
  ACCESS_DENIED: "Bạn không có quyền truy cập checklist này.",
};

export function getTaskStepErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return taskStepErrorMessages[error.details.code] ?? getErrorMessage(error);
  }

  return getErrorMessage(error);
}
