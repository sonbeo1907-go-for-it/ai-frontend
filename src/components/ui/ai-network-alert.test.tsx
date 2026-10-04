import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiNetworkAlert } from "./ai-network-alert";

describe("AiNetworkAlert component", () => {
  it("renders network disconnection warning and assures user AI is still running on server (AC6)", () => {
    render(<AiNetworkAlert />);

    expect(screen.getByText("Mất kết nối mạng tạm thời")).toBeDefined();
    expect(
      screen.getByText(/Máy chủ AI vẫn đang tiếp tục xử lý tác vụ của bạn, dữ liệu học tập không bị mất/i)
    ).toBeDefined();
  });

  it("renders custom message and triggers onRefresh when clicked", () => {
    const handleRefresh = vi.fn();
    render(
      <AiNetworkAlert
        message="Không thể kết nối đến máy chủ."
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText(/Không thể kết nối đến máy chủ/)).toBeDefined();

    const refreshButton = screen.getByRole("button", { name: /Tải lại trạng thái/i });
    expect(refreshButton).toBeDefined();

    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});
