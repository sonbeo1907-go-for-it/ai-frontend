import { describe, expect, it } from "vitest";
import { getAiErrorTaxonomy } from "./ai-error-taxonomy";

describe("ai-error-taxonomy", () => {
  it("maps configuration error codes to CONFIG category and MANUAL recovery action", () => {
    const configCodes = [
      "AI_PROVIDER_NOT_FOUND",
      "AI_PROVIDER_CONFIG_NOT_FOUND",
      "AI_PROVIDER_CREDENTIAL_NOT_FOUND",
      "AI_PROVIDER_CREDENTIAL_REQUIRED",
      "AI_PROVIDER_INVALID_CONFIGURATION",
      "AI_PROVIDER_DEFAULT_REQUIRED",
      "API_KEY_INVALID",
      "BAD_REQUEST",
    ];

    for (const code of configCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("CONFIG");
      expect(taxonomy.recoveryAction).toBe("MANUAL");
      expect(taxonomy.canRetry).toBe(false);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Cấu hình AI chưa hoàn tất");
      expect(taxonomy.dataSafetyMessage).toContain("không bị ghi đè");
    }
  });

  it("maps timeout error codes to TIMEOUT category and BOTH recovery action", () => {
    const timeoutCodes = ["AI_TIMEOUT", "TIMEOUT", "PROVIDER_TIMEOUT", "GATEWAY_TIMEOUT"];

    for (const code of timeoutCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("TIMEOUT");
      expect(taxonomy.recoveryAction).toBe("BOTH");
      expect(taxonomy.canRetry).toBe(true);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Hết thời gian phản hồi AI");
    }
  });

  it("maps provider error codes to PROVIDER category and BOTH recovery action", () => {
    const providerCodes = ["AI_PROVIDER_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "SERVICE_UNAVAILABLE"];

    for (const code of providerCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("PROVIDER");
      expect(taxonomy.recoveryAction).toBe("BOTH");
      expect(taxonomy.canRetry).toBe(true);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Dịch vụ AI tạm thời không khả dụng");
    }
  });

  it("maps output format errors to INVALID_OUTPUT category and BOTH recovery action", () => {
    const outputCodes = [
      "AI_OUTPUT_INVALID",
      "INVALID_API_RESPONSE",
      "PARSING_ERROR",
      "CONTEXT_OVERFLOW",
    ];

    for (const code of outputCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("INVALID_OUTPUT");
      expect(taxonomy.recoveryAction).toBe("BOTH");
      expect(taxonomy.canRetry).toBe(true);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Kết quả AI không hợp lệ");
    }
  });

  it("maps rate limits and quotas to BUDGET category and MANUAL recovery action", () => {
    const budgetCodes = [
      "RATE_LIMIT_EXCEEDED",
      "AI_RATE_LIMIT",
      "QUOTA_EXCEEDED",
      "TOKEN_BUDGET_EXCEEDED",
    ];

    for (const code of budgetCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("BUDGET");
      expect(taxonomy.recoveryAction).toBe("MANUAL");
      expect(taxonomy.canRetry).toBe(false);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Đạt giới hạn mức sử dụng AI");
    }
  });

  it("maps credit error codes to CREDIT category and MANUAL recovery action", () => {
    const taxonomy = getAiErrorTaxonomy("INSUFFICIENT_AI_CREDITS");
    expect(taxonomy.category).toBe("CREDIT");
    expect(taxonomy.recoveryAction).toBe("MANUAL");
    expect(taxonomy.canRetry).toBe(false);
    expect(taxonomy.canManual).toBe(true);
    expect(taxonomy.title).toBe("Số dư AI Credit không đủ");
    expect(taxonomy.description).toContain("nạp thêm Credit");
  });

  it("maps network disruption codes to TEMPORARY category and RETRY recovery action", () => {
    const tempCodes = ["NETWORK_ERROR", "CONNECTION_RESET", "FETCH_ERROR", "TEMPORARY_ERROR"];

    for (const code of tempCodes) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("TEMPORARY");
      expect(taxonomy.recoveryAction).toBe("RETRY");
      expect(taxonomy.canRetry).toBe(true);
      expect(taxonomy.canManual).toBe(false);
      expect(taxonomy.title).toBe("Sự cố kết nối tạm thời");
    }
  });

  it("maps unrecognized or missing codes to UNKNOWN category and BOTH recovery action", () => {
    const fallbackCases = [undefined, null, "", "SOME_RANDOM_CODE", "AI_GENERATION_FAILED"];

    for (const code of fallbackCases) {
      const taxonomy = getAiErrorTaxonomy(code);
      expect(taxonomy.category).toBe("UNKNOWN");
      expect(taxonomy.recoveryAction).toBe("BOTH");
      expect(taxonomy.canRetry).toBe(true);
      expect(taxonomy.canManual).toBe(true);
      expect(taxonomy.title).toBe("Xử lý AI gặp sự cố");
      expect(taxonomy.dataSafetyMessage).toContain("giữ nguyên an toàn");
    }
  });
});
