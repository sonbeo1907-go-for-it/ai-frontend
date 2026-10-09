import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutResultPage from "./page";
import { useSearchParams } from "next/navigation";
import * as confirmationHook from "@/features/billing/use-payment-confirmation";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

describe("CheckoutResultPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts vnp_TxnRef from search params and delegates to usePaymentConfirmation", () => {
    const mockParams = new URLSearchParams({ vnp_TxnRef: "ORD-999-TEST" });
    vi.mocked(useSearchParams).mockReturnValue(mockParams as any);

    const useConfirmationSpy = vi.spyOn(confirmationHook, "usePaymentConfirmation").mockReturnValue({
      order: {
        id: "ord-999",
        orderCode: "ORD-999-TEST",
        packageCode: "AI_STARTER_50K",
        packageName: "Gói AI Khởi Đầu",
        priceVnd: 50000,
        baseCredits: 5000,
        bonusCredits: 0,
        totalCredits: 5000,
        status: "PAID",
        currency: "VND",
        paymentProvider: "VNPAY",
        checkoutUrl: null,
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      status: "SUCCESS",
      isLoading: false,
      error: null,
      pollCount: 1,
      retryPolling: vi.fn(),
    });

    render(<CheckoutResultPage />);

    expect(useConfirmationSpy).toHaveBeenCalledWith({
      orderCode: "ORD-999-TEST",
      orderId: null,
    });
    expect(screen.getByTestId("payment-success")).not.toBeNull();
    expect(screen.getByText("Nạp AI Credit thành công!")).not.toBeNull();
  });
});
