import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiErrorAlert } from "./ai-error-alert";
import type { AiExecution } from "@/types/api";

const mockExecution: AiExecution = {
  id: "exec-test-123",
  entityVersion: 1,
  providerConfigId: "cfg-1",
  purpose: "ROADMAP_GENERATION",
  operation: "GENERATE",
  targetType: "ROADMAP",
  targetId: "roadmap-1",
  status: "FAILED",
  attemptCount: 1,
  failureCode: "AI_TIMEOUT",
  failureMessage: "RAW_PROVIDER_SECRET_KEY_AND_PROMPT_DO_NOT_LEAK",
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:05:00Z",
  completedAt: "2026-10-01T10:05:00Z",
};

describe("AiErrorAlert component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders localized Vietnamese title, description, and data safety confirmation (AC1, AC2)", () => {
    render(<AiErrorAlert execution={mockExecution} />);

    // AC1: Localized title & description for AI_TIMEOUT
    expect(screen.getByText("Hết thời gian phản hồi AI")).toBeDefined();
    expect(screen.getByText(/Yêu cầu xử lý AI mất nhiều thời gian hơn dự kiến/)).toBeDefined();

    // AC2: Data safety confirmation
    expect(
      screen.getByText(/Dữ liệu và tiến độ học tập trước đó của bạn được giữ nguyên an toàn/i)
    ).toBeDefined();
  });

  it("does NOT leak raw failureMessage or sensitive provider responses (AC4)", () => {
    render(<AiErrorAlert execution={mockExecution} />);

    // AC4: Ensure sensitive raw failureMessage is never in the DOM
    expect(
      screen.queryByText(/RAW_PROVIDER_SECRET_KEY_AND_PROMPT_DO_NOT_LEAK/)
    ).toBeNull();
  });

  it("renders both Retry and Manual buttons when recoveryAction is BOTH (AC3)", () => {
    const handleRetry = vi.fn();
    const handleManual = vi.fn();

    render(
      <AiErrorAlert
        execution={mockExecution} // AI_TIMEOUT -> BOTH
        onRetry={handleRetry}
        onManualFallback={handleManual}
      />
    );

    const retryButton = screen.getByRole("button", { name: /Thử lại/i });
    const manualButton = screen.getByRole("button", { name: /Làm thủ công/i });

    expect(retryButton).toBeDefined();
    expect(manualButton).toBeDefined();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(manualButton);
    expect(handleManual).toHaveBeenCalledTimes(1);
  });

  it("renders ONLY Manual button when category is BUDGET or CONFIG (AC3)", () => {
    const handleRetry = vi.fn();
    const handleManual = vi.fn();

    render(
      <AiErrorAlert
        execution={{
          ...mockExecution,
          failureCode: "RATE_LIMIT_EXCEEDED", // BUDGET -> MANUAL only
        }}
        onRetry={handleRetry}
        onManualFallback={handleManual}
      />
    );

    expect(screen.queryByRole("button", { name: /Thử lại/i })).toBeNull();
    const manualButton = screen.getByRole("button", { name: /Làm thủ công/i });
    expect(manualButton).toBeDefined();

    fireEvent.click(manualButton);
    expect(handleManual).toHaveBeenCalledTimes(1);
  });

  it("renders ONLY Retry button when category is TEMPORARY (AC3)", () => {
    const handleRetry = vi.fn();
    const handleManual = vi.fn();

    render(
      <AiErrorAlert
        execution={{
          ...mockExecution,
          failureCode: "NETWORK_ERROR", // TEMPORARY -> RETRY only
        }}
        onRetry={handleRetry}
        onManualFallback={handleManual}
      />
    );

    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Làm thủ công/i })).toBeNull();
  });

  it("supports diagnostics accordion and clipboard copy without leaking content (AC5)", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <AiErrorAlert
        execution={mockExecution}
        requestId="req-xyz-987"
        timestamp="2026-10-01T10:05:00Z"
      />
    );

    const expandBtn = screen.getByRole("button", { name: /Chi tiết chẩn đoán hỗ trợ/i });
    expect(expandBtn).toBeDefined();

    // Click to open diagnostics
    fireEvent.click(expandBtn);

    expect(screen.getByText("exec-test-123")).toBeDefined();
    expect(screen.getByText("req-xyz-987")).toBeDefined();
    expect(screen.getByText("2026-10-01T10:05:00Z")).toBeDefined();

    // Click copy button
    const copyBtn = screen.getByRole("button", { name: /Sao chép/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("Execution ID: exec-test-123");
    expect(copiedText).toContain("Request ID: req-xyz-987");
    expect(copiedText).toContain("Thời điểm: 2026-10-01T10:05:00Z");
    expect(copiedText).toContain("Nhóm lỗi: TIMEOUT");
    expect(copiedText).not.toContain("RAW_PROVIDER_SECRET_KEY_AND_PROMPT_DO_NOT_LEAK");

    // Feedback shows "Đã sao chép"
    await waitFor(() => {
      expect(screen.getByText("Đã sao chép")).toBeDefined();
    });
  });
});
