import type { AiPurpose } from "@/types/api";

export interface PlaceholderDefinition {
  key: string;
  syntax: string;
  label: string;
  description: string;
  syntheticDefault: string;
}

export const AI_PROMPT_PLACEHOLDERS: Record<AiPurpose, PlaceholderDefinition[]> = {
  ROADMAP_GENERATION: [
    {
      key: "language",
      syntax: "{{language}}",
      label: "Ngôn ngữ",
      description: "Mã ngôn ngữ IETF BCP 47 cho phản hồi AI (ví dụ: vi-VN)",
      syntheticDefault: "vi-VN",
    },
  ],
  DAILY_PLAN_GENERATION: [
    {
      key: "language",
      syntax: "{{language}}",
      label: "Ngôn ngữ",
      description: "Mã ngôn ngữ IETF BCP 47 cho phản hồi AI (ví dụ: vi-VN)",
      syntheticDefault: "vi-VN",
    },
    {
      key: "availableMinutes",
      syntax: "{{availableMinutes}}",
      label: "Thời gian khả dụng (phút)",
      description: "Tổng số phút người học cam kết trong ngày (ví dụ: 120)",
      syntheticDefault: "120",
    },
    {
      key: "maxReviewMinutes",
      syntax: "{{maxReviewMinutes}}",
      label: "Thời gian ôn tập tối đa (phút)",
      description: "Giới hạn phút tối đa dành cho tác vụ ôn tập (ví dụ: 36)",
      syntheticDefault: "36",
    },
  ],
  QUIZ_GENERATION: [
    {
      key: "language",
      syntax: "{{language}}",
      label: "Ngôn ngữ",
      description: "Mã ngôn ngữ IETF BCP 47 cho câu hỏi trắc nghiệm (ví dụ: vi-VN)",
      syntheticDefault: "vi-VN",
    },
  ],
  TASK_GUIDANCE_GENERATION: [
    {
      key: "language",
      syntax: "{{language}}",
      label: "Ngôn ngữ",
      description: "Mã ngôn ngữ IETF BCP 47 cho các bước hướng dẫn (ví dụ: vi-VN)",
      syntheticDefault: "vi-VN",
    },
  ],
  DOCUMENT_EXTRACTION: [],
  DAILY_PLAN_REVIEW: [],
};

export function getDefaultSyntheticData(purpose: AiPurpose): Record<string, string> {
  const placeholders = AI_PROMPT_PLACEHOLDERS[purpose] ?? [];
  const defaults: Record<string, string> = {};
  for (const p of placeholders) {
    defaults[p.key] = p.syntheticDefault;
  }
  return defaults;
}
