import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiExecutionFilterBar } from "./ai-execution-filter-bar";

describe("AiExecutionFilterBar", () => {
  it("submits changed filters via onApply", () => {
    const handleApply = vi.fn();
    const handleReset = vi.fn();

    render(
      <AiExecutionFilterBar
        filters={{}}
        onApply={handleApply}
        onReset={handleReset}
      />,
    );

    // Change status select
    const statusSelect = screen.getByLabelText(/Lọc theo trạng thái/i);
    fireEvent.change(statusSelect, { target: { value: "FAILED" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Lọc kết quả/i });
    fireEvent.click(submitBtn);

    expect(handleApply).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
      }),
    );
  });

  it("triggers onReset when clicking reset button", () => {
    const handleApply = vi.fn();
    const handleReset = vi.fn();

    render(
      <AiExecutionFilterBar
        filters={{ status: "FAILED" }}
        onApply={handleApply}
        onReset={handleReset}
      />,
    );

    const resetBtn = screen.getByRole("button", { name: /Đặt lại mặc định/i });
    fireEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalled();
  });
});
