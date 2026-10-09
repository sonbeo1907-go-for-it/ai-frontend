import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreditTransactionsView } from "./credit-transactions-view";
import * as billingApi from "./billing-api";

vi.mock("./billing-api", () => ({
  fetchCreditTransactions: vi.fn(),
}));

describe("CreditTransactionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders transaction history with RELEASE entries clearly indicated", async () => {
    vi.mocked(billingApi.fetchCreditTransactions).mockResolvedValue({
      content: [
        {
          id: "tx-1",
          recordedAt: "2026-10-09T08:00:00Z",
          entryType: "RELEASE_RESERVE",
          amount: 10,
          availableDelta: 10,
          reservedDelta: -10,
          availableBalanceAfter: 50,
          reservedBalanceAfter: 0,
          totalBalanceAfter: 50,
          referenceType: "AI_EXECUTION",
          referenceId: "exec-12345678",
          description: "Hoàn lại credit giữ chỗ do thao tác AI không thành công",
          status: "RELEASED",
        },
        {
          id: "tx-2",
          recordedAt: "2026-10-09T07:50:00Z",
          entryType: "RESERVE",
          amount: 10,
          availableDelta: -10,
          reservedDelta: 10,
          availableBalanceAfter: 40,
          reservedBalanceAfter: 10,
          totalBalanceAfter: 50,
          referenceType: "AI_EXECUTION",
          referenceId: "exec-12345678",
          description: "Giữ chỗ credit cho thao tác AI: ROADMAP_GENERATION",
          status: "RESERVED",
        },
      ],
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      first: true,
      last: true,
    });

    render(<CreditTransactionsView />);

    await waitFor(() => {
      expect(screen.getByText("Lịch sử giao dịch Credit")).not.toBeNull();
    });

    // Check that RELEASE entry is clearly displayed
    expect(screen.getAllByText("Hoàn giữ chỗ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hoàn lại credit giữ chỗ do thao tác AI không thành công")).not.toBeNull();
    expect(screen.getByText("+10 Credit khả dụng")).not.toBeNull();

    // Check that RESERVE entry is displayed
    expect(screen.getAllByText("Giữ chỗ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-10 Credit khả dụng")).not.toBeNull();
  });

  it("filters transactions when user selects a transaction type", async () => {
    vi.mocked(billingApi.fetchCreditTransactions).mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    });

    render(<CreditTransactionsView />);

    await waitFor(() => {
      expect(billingApi.fetchCreditTransactions).toHaveBeenCalledTimes(1);
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "RELEASE_RESERVE" } });

    await waitFor(() => {
      expect(billingApi.fetchCreditTransactions).toHaveBeenCalledWith({
        type: "RELEASE_RESERVE",
        from: undefined,
        to: undefined,
        page: 0,
        size: 10,
      });
    });
  });
});
