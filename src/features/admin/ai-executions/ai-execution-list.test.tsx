import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiExecutionList } from "./ai-execution-list";
import type { AdminAiExecutionSummary, PageResponse } from "@/types/api";

const mockPageData: PageResponse<AdminAiExecutionSummary> = {
  content: [
    {
      id: "exec-1",
      providerId: "prov-1",
      providerName: "OpenAI Production",
      model: "gpt-4o",
      purpose: "ROADMAP_GENERATION",
      operation: "GENERATE",
      status: "SUCCEEDED",
      failureCode: null,
      createdAt: "2026-09-30T09:00:00Z",
    },
    {
      id: "exec-2",
      providerId: null,
      providerName: null,
      model: "deepseek-coder",
      purpose: "TASK_GUIDANCE_GENERATION",
      operation: "GENERATE",
      status: "FAILED",
      failureCode: "AI_RATE_LIMIT",
      createdAt: "2026-09-30T09:05:00Z",
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  first: true,
  last: true,
};

describe("AiExecutionList", () => {
  it("renders 403 Forbidden state clearly without crashing", () => {
    render(
      <AiExecutionList
        pageData={null}
        loading={false}
        error={{ status: 403, message: "Yêu cầu quyền ADMIN." }}
        onSelectExecution={vi.fn()}
        onPageChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/403 Forbidden/i)).toBeDefined();
    expect(screen.getByText(/Yêu cầu quyền ADMIN/i)).toBeDefined();
  });

  it("renders generic error state and retry button", () => {
    const handleRetry = vi.fn();
    render(
      <AiExecutionList
        pageData={null}
        loading={false}
        error={{ status: 500, message: "Lỗi kết nối máy chủ" }}
        onSelectExecution={vi.fn()}
        onPageChange={vi.fn()}
        onRetry={handleRetry}
      />,
    );

    expect(screen.getByText(/Không thể nạp danh sách/i)).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /Thử lại/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalled();
  });

  it("renders empty state when content is empty", () => {
    render(
      <AiExecutionList
        pageData={{
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        }}
        loading={false}
        error={null}
        onSelectExecution={vi.fn()}
        onPageChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/Không tìm thấy lịch sử thực thi AI/i)).toBeDefined();
  });

  it("renders table rows, provider names, and failure codes", () => {
    const handleSelect = vi.fn();
    render(
      <AiExecutionList
        pageData={mockPageData}
        loading={false}
        error={null}
        onSelectExecution={handleSelect}
        onPageChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("OpenAI Production")).toBeDefined();
    expect(screen.getByText("deepseek-coder")).toBeDefined();
    expect(screen.getByText("AI_RATE_LIMIT")).toBeDefined();
    expect(screen.getByText("SUCCEEDED")).toBeDefined();
    expect(screen.getByText("FAILED")).toBeDefined();

    // Clicking diagnostic button calls onSelectExecution
    const diagnosticBtns = screen.getAllByRole("button", { name: /Chẩn đoán/i });
    fireEvent.click(diagnosticBtns[0]);
    expect(handleSelect).toHaveBeenCalledWith("exec-1");
  });
});
