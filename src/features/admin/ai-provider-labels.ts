import type { AiProviderProtocol, AiPurpose, CredentialSelectionStrategy } from "@/types/api";

export const AI_PURPOSES: AiPurpose[] = [
  "DOCUMENT_EXTRACTION",
  "ROADMAP_GENERATION",
  "DAILY_PLAN_GENERATION",
  "DAILY_PLAN_REVIEW",
  "QUIZ_GENERATION",
];

export const purposeLabels: Record<AiPurpose, string> = {
  DOCUMENT_EXTRACTION: "Trích xuất tài liệu",
  ROADMAP_GENERATION: "Sinh lộ trình",
  DAILY_PLAN_GENERATION: "Sinh kế hoạch ngày",
  DAILY_PLAN_REVIEW: "Đánh giá kế hoạch ngày",
  QUIZ_GENERATION: "Sinh bài kiểm tra",
};

export const purposeDescriptions: Record<AiPurpose, string> = {
  DOCUMENT_EXTRACTION: "Chuyển nội dung nguồn thành dữ liệu có cấu trúc.",
  ROADMAP_GENERATION: "Phân rã mục tiêu và tài liệu thành Master Plan.",
  DAILY_PLAN_GENERATION: "Lập kế hoạch ngày từ lộ trình và tiến độ.",
  DAILY_PLAN_REVIEW: "Đưa ra nhận xét tư vấn cho một phiên bản kế hoạch.",
  QUIZ_GENERATION: "Tạo Micro-Quiz và bài kiểm tra củng cố theo chủ đề.",
};

export const protocolLabels: Record<AiProviderProtocol, string> = {
  OPENAI_COMPATIBLE: "Tương thích OpenAI",
};

export const credentialStrategyLabels: Record<CredentialSelectionStrategy, string> = {
  PRIORITY: "Ưu tiên theo thứ tự",
};

export const providerPresets = {
  OPENAI: {
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    secretRef: "env:OPENAI_API_KEY",
  },
  DEEPSEEK: {
    displayName: "DeepSeek AI",
    baseUrl: "https://api.deepseek.com/v1",
    secretRef: "env:DEEPSEEK_API_KEY",
  },
} as const;
