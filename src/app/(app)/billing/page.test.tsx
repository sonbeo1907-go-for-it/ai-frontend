import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTopUpOrder } from "@/features/billing/use-top-up-order";
import BillingPage from "./page";

vi.mock("@/features/billing/use-top-up-order", () => ({
  useTopUpOrder: vi.fn(),
}));

vi.mock("@/features/billing/wallet-card", () => ({
  WalletCard: () => <div>Wallet</div>,
}));

vi.mock("@/features/billing/credit-transactions-view", () => ({
  CreditTransactionsView: () => <div>Transactions</div>,
}));

describe("billing page contrast", () => {
  beforeEach(() => {
    vi.mocked(useTopUpOrder).mockReturnValue({
      paymentsEnabled: false,
      packages: [],
      loadingPackages: false,
      packageError: null,
      refreshPackages: vi.fn(),
      purchasingPackageId: null,
      purchaseError: null,
      lastCreatedOrder: null,
      purchasePackage: vi.fn(),
    });
  });

  it("uses dark text for the purchase heading and description on the light page", () => {
    const { container } = render(<BillingPage />);

    expect(
      screen
        .getByRole("heading", { name: "Mua gói AI Credit" })
        .classList.contains("text-slate-900"),
    ).toBe(true);
    expect(screen.getByText(/Trang bị AI Credit/).classList.contains("text-slate-600")).toBe(true);
    expect(container.querySelector('[class*="dark:"]')).toBeNull();
  });

  it("uses a solid light surface, dark blue text and readable sizing for the safety notice", () => {
    render(<BillingPage />);
    const notice = screen.getByText("Thanh toán an toàn qua VNPAY:").parentElement?.parentElement;

    expect(notice?.classList.contains("bg-blue-50")).toBe(true);
    expect(notice?.classList.contains("text-blue-800")).toBe(true);
    expect(notice?.classList.contains("text-sm")).toBe(true);
    expect(notice?.classList.contains("leading-6")).toBe(true);
    expect(notice?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Nạp Credit hiện chưa được bật");
  });

  it("keeps package-loading errors readable without enabling purchases", () => {
    vi.mocked(useTopUpOrder).mockReturnValue({
      ...vi.mocked(useTopUpOrder)(),
      packageError: "Không thể tải gói Credit.",
    });
    const { container } = render(<BillingPage />);

    expect(screen.getByRole("alert").textContent).toContain("Không thể tải gói Credit.");
    expect(container.querySelector('[class*="dark:"]')).toBeNull();
  });
});
