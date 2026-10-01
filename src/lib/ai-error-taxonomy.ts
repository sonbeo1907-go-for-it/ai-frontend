export type AiFailureCategory =
  | "CONFIG"
  | "TIMEOUT"
  | "PROVIDER"
  | "INVALID_OUTPUT"
  | "BUDGET"
  | "TEMPORARY"
  | "UNKNOWN";

export type RecoveryActionType = "RETRY" | "MANUAL" | "BOTH" | "NONE";

export interface AiErrorTaxonomyInfo {
  category: AiFailureCategory;
  title: string;
  description: string;
  dataSafetyMessage: string;
  recoveryAction: RecoveryActionType;
  canRetry: boolean;
  canManual: boolean;
}

const DEFAULT_DATA_SAFETY_MESSAGE =
  "Dữ liệu và tiến độ học tập trước đó của bạn được giữ nguyên an toàn, không bị ghi đè và không kích hoạt bản nháp lỗi.";

const CATEGORY_DEFINITIONS: Record<
  AiFailureCategory,
  {
    title: string;
    description: string;
    dataSafetyMessage: string;
    recoveryAction: RecoveryActionType;
  }
> = {
  CONFIG: {
    title: "Cấu hình AI chưa hoàn tất",
    description:
      "Hệ thống gặp sự cố về thiết lập nhà cung cấp hoặc thông tin xác thực AI. Bạn có thể tiếp tục thực hiện thủ công hoặc liên hệ quản trị viên.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "MANUAL",
  },
  TIMEOUT: {
    title: "Hết thời gian phản hồi AI",
    description:
      "Yêu cầu xử lý AI mất nhiều thời gian hơn dự kiến và đã tạm dừng để tránh nghẽn luồng. Bạn có thể thử lại ngay hoặc chuyển sang thao tác thủ công.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "BOTH",
  },
  PROVIDER: {
    title: "Dịch vụ AI tạm thời không khả dụng",
    description:
      "Dịch vụ AI từ nhà cung cấp đang gián đoạn hoặc quá tải. Bạn có thể gửi lại yêu cầu sau ít phút hoặc nhập liệu thủ công.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "BOTH",
  },
  INVALID_OUTPUT: {
    title: "Kết quả AI không hợp lệ",
    description:
      "Nội dung phản hồi từ AI không đúng cấu trúc yêu cầu hoặc vượt ngưỡng nội dung. Bản nháp lỗi đã được thu hồi an toàn.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "BOTH",
  },
  BUDGET: {
    title: "Đạt giới hạn mức sử dụng AI",
    description:
      "Tài nguyên hoặc ngân sách gọi AI đã đạt ngưỡng tối đa trong ngày/tháng. Vui lòng chuyển sang tự thực hiện thủ công.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "MANUAL",
  },
  TEMPORARY: {
    title: "Sự cố kết nối tạm thời",
    description:
      "Đường truyền giữa hệ thống và AI bị gián đoạn chốc lát. Yêu cầu của bạn có thể thử lại ngay lập tức.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "RETRY",
  },
  UNKNOWN: {
    title: "Xử lý AI gặp sự cố",
    description:
      "Quá trình sinh dữ liệu tự động gặp lỗi chưa xác định. Dữ liệu của bạn được bảo toàn nguyên vẹn.",
    dataSafetyMessage: DEFAULT_DATA_SAFETY_MESSAGE,
    recoveryAction: "BOTH",
  },
};

const CODE_TO_CATEGORY: Record<string, AiFailureCategory> = {
  // Cấu hình (CONFIG)
  AI_PROVIDER_NOT_FOUND: "CONFIG",
  AI_PROVIDER_CONFIG_NOT_FOUND: "CONFIG",
  AI_PROVIDER_CREDENTIAL_NOT_FOUND: "CONFIG",
  AI_PROVIDER_CREDENTIAL_REQUIRED: "CONFIG",
  AI_PROVIDER_INVALID_CONFIGURATION: "CONFIG",
  AI_PROVIDER_DEFAULT_REQUIRED: "CONFIG",
  API_KEY_INVALID: "CONFIG",
  BAD_REQUEST: "CONFIG",

  // Timeout (TIMEOUT)
  AI_TIMEOUT: "TIMEOUT",
  TIMEOUT: "TIMEOUT",
  PROVIDER_TIMEOUT: "TIMEOUT",
  GATEWAY_TIMEOUT: "TIMEOUT",

  // Provider (PROVIDER)
  AI_PROVIDER_UNAVAILABLE: "PROVIDER",
  PROVIDER_UNAVAILABLE: "PROVIDER",
  SERVICE_UNAVAILABLE: "PROVIDER",

  // Output không hợp lệ (INVALID_OUTPUT)
  AI_OUTPUT_INVALID: "INVALID_OUTPUT",
  INVALID_API_RESPONSE: "INVALID_OUTPUT",
  PARSING_ERROR: "INVALID_OUTPUT",
  CONTEXT_OVERFLOW: "INVALID_OUTPUT",

  // Budget / Quota (BUDGET)
  RATE_LIMIT_EXCEEDED: "BUDGET",
  AI_RATE_LIMIT: "BUDGET",
  QUOTA_EXCEEDED: "BUDGET",
  TOKEN_BUDGET_EXCEEDED: "BUDGET",

  // Lỗi tạm thời (TEMPORARY)
  NETWORK_ERROR: "TEMPORARY",
  CONNECTION_RESET: "TEMPORARY",
  FETCH_ERROR: "TEMPORARY",
  TEMPORARY_ERROR: "TEMPORARY",

  // Chung / Thất bại
  AI_GENERATION_FAILED: "UNKNOWN",
  INTERNAL_ERROR: "UNKNOWN",
};

/**
 * Trả về thông tin phân loại lỗi, nội dung tiếng Việt thân thiện,
 * thông điệp an toàn dữ liệu và quyền hành động phục hồi.
 */
export function getAiErrorTaxonomy(failureCode?: string | null): AiErrorTaxonomyInfo {
  const normalizedCode = failureCode ? failureCode.trim().toUpperCase() : "";
  const category = (normalizedCode && CODE_TO_CATEGORY[normalizedCode]) || "UNKNOWN";
  const def = CATEGORY_DEFINITIONS[category];

  const canRetry = def.recoveryAction === "RETRY" || def.recoveryAction === "BOTH";
  const canManual = def.recoveryAction === "MANUAL" || def.recoveryAction === "BOTH";

  return {
    category,
    title: def.title,
    description: def.description,
    dataSafetyMessage: def.dataSafetyMessage,
    recoveryAction: def.recoveryAction,
    canRetry,
    canManual,
  };
}
