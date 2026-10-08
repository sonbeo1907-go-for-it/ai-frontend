import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WalletCard } from "./wallet-card";
import { billingApi } from "@/lib/api-client";

describe("WalletCard Component (US-PAY-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders available and reserved credits from billing API", async () => {
    vi.spyOn(billingApi, "getWallet").mockResolvedValue({
      id: "wallet-uuid-1",
      availableCredits: 1000,
      reservedCredits: 0,
    });

    render(<WalletCard />);

    expect(screen.getByText("Ví AI Credit")).not.toBeNull();
    expect(screen.getByText("Credit Khả dụng")).not.toBeNull();
    expect(screen.getByText("Credit Đang giữ chỗ")).not.toBeNull();

    await waitFor(() => {
      expect(screen.getByText(/1[.,]000/)).not.toBeNull();
      expect(screen.getByText("0")).not.toBeNull();
    });

    expect(
      screen.getByText("Nguyên tắc học tập không gián đoạn"),
    ).not.toBeNull();
  });

  it("handles zero credit and assures user about manual learning", async () => {
    vi.spyOn(billingApi, "getWallet").mockResolvedValue({
      id: "wallet-uuid-zero",
      availableCredits: 0,
      reservedCredits: 0,
    });

    render(<WalletCard />);

    await waitFor(() => {
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    expect(
      screen.getByText(/Ngay cả khi số dư Credit bằng 0/i),
    ).not.toBeNull();
  });

  it("refreshes wallet when clicking refresh button", async () => {
    let callCount = 0;
    const getWalletSpy = vi
      .spyOn(billingApi, "getWallet")
      .mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            id: "wallet-uuid-1",
            availableCredits: 1000,
            reservedCredits: 0,
          };
        }
        return {
          id: "wallet-uuid-1",
          availableCredits: 1500,
          reservedCredits: 200,
        };
      });

    render(<WalletCard />);

    await waitFor(() => {
      expect(screen.getByText(/1[.,]000/)).not.toBeNull();
    });

    const refreshButton = screen.getByRole("button", { name: /làm mới/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText(/1[.,]500/)).not.toBeNull();
      expect(screen.getByText("200")).not.toBeNull();
    });

    expect(getWalletSpy).toHaveBeenCalledTimes(2);
  });
});
