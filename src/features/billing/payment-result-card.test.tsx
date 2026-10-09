import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentResultCard } from "./payment-result-card";
import type { TopUpOrderResponse } from "@/types/api";

describe("PaymentResultCard", () => {
  const mockOrder: TopUpOrderResponse = {
    id: "ord-123",
    orderCode: "TOPUP-123456",
    packageCode: "AI_STARTER_50K",
    packageName: "Gói AI Khởi Đầu",
    priceVnd: 50000,
    baseCredits: 5000,
    bonusCredits: 0,
    totalCredits: 5000,
    status: "PENDING",
    currency: "VND",
    paymentProvider: "VNPAY",
    checkoutUrl: null,
    expiresAt: new Date(Date.now() + 900000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  it("renders VERIFYING state with waiting indicator and order details", () => {
    render(
      <PaymentResultCard
        order={mockOrder}
        status="VERIFYING"
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("payment-verifying")).not.toBeNull();
    expect(screen.getByText("Đang chờ xác minh thanh toán")).not.toBeNull();
    expect(screen.getByText("TOPUP-123456")).not.toBeNull();
    expect(screen.getByText("Gói AI Khởi Đầu")).not.toBeNull();
  });

  it("renders SUCCESS state with credits badge and action buttons when PAID", () => {
    render(
      <PaymentResultCard
        order={{ ...mockOrder, status: "PAID" }}
        status="SUCCESS"
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("payment-success")).not.toBeNull();
    expect(screen.getByText("Nạp AI Credit thành công!")).not.toBeNull();
    expect(screen.getByText("+5.000 Credit")).not.toBeNull();
    const link = screen.getByRole("link", { name: "Xem ví AI Credit" });
    expect(link.getAttribute("href")).toBe("/billing");
  });

  it("renders TIMEOUT state without concluding failure and provides retry button", () => {
    const onRetry = vi.fn();
    render(
      <PaymentResultCard
        order={mockOrder}
        status="TIMEOUT"
        isLoading={false}
        error={null}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId("payment-timeout")).not.toBeNull();
    expect(screen.getByText("Đang chờ ngân hàng xác nhận")).not.toBeNull();
    expect(
      screen.getByText(/Hệ thống chưa nhận được phản hồi tức thì từ cổng thanh toán/i),
    ).not.toBeNull();

    const retryBtn = screen.getByRole("button", { name: "Kiểm tra lại ngay" });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders FAILED state with failure explanation and back button", () => {
    render(
      <PaymentResultCard
        order={{ ...mockOrder, status: "FAILED" }}
        status="FAILED"
        isLoading={false}
        error="Cổng thanh toán báo giao dịch không thành công."
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByTestId("payment-failure")).not.toBeNull();
    expect(screen.getByText("Thanh toán không thành công")).not.toBeNull();
    expect(screen.getByText("Cổng thanh toán báo giao dịch không thành công.")).not.toBeNull();
    const link = screen.getByRole("link", { name: "Chọn gói nạp khác" });
    expect(link.getAttribute("href")).toBe("/billing");
  });
});
