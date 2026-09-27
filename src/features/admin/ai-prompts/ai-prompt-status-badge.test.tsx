import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiPromptStatusBadge } from "./ai-prompt-status-badge";

describe("AiPromptStatusBadge", () => {
  it("renders ACTIVE status with accessible label and star indicator", () => {
    render(<AiPromptStatusBadge status="ACTIVE" />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Trạng thái: Đang hoạt động (ACTIVE)");
    expect(badge.textContent).toContain("ACTIVE ★");
  });

  it("renders DRAFT status with accessible label and edit indicator", () => {
    render(<AiPromptStatusBadge status="DRAFT" />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Trạng thái: Bản nháp (DRAFT)");
    expect(badge.textContent).toContain("DRAFT ✎");
  });

  it("renders PUBLISHED status with accessible label", () => {
    render(<AiPromptStatusBadge status="PUBLISHED" />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Trạng thái: Đã phát hành (PUBLISHED)");
    expect(badge.textContent).toContain("PUBLISHED");
  });

  it("renders ARCHIVED status with accessible label", () => {
    render(<AiPromptStatusBadge status="ARCHIVED" />);
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-label")).toBe("Trạng thái: Đã lưu trữ (ARCHIVED)");
    expect(badge.textContent).toContain("ARCHIVED");
  });
});
