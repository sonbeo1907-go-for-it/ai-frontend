import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentConfirmation } from "./use-payment-confirmation";
import { billingApi } from "@/lib/api-client";
import type { TopUpOrderResponse } from "@/types/api";

describe("usePaymentConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mockOrder = (status: string): TopUpOrderResponse => ({
    id: "ord-123",
    orderCode: "TOPUP-123456",
    packageCode: "AI_STARTER_50K",
    packageName: "Gói AI Khởi Đầu",
    priceVnd: 50000,
    baseCredits: 5000,
    bonusCredits: 0,
    totalCredits: 5000,
    status,
    currency: "VND",
    paymentProvider: "VNPAY",
    checkoutUrl: null,
    expiresAt: new Date(Date.now() + 900000).toISOString(),
    createdAt: new Date().toISOString(),
  });

  it("polls backend until order is PAID and sets SUCCESS status", async () => {
    // First poll returns PENDING, second poll returns PAID
    const getSpy = vi
      .spyOn(billingApi, "getTopUpOrderByCode")
      .mockResolvedValueOnce(mockOrder("PENDING"))
      .mockResolvedValueOnce(mockOrder("PAID"));

    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        orderCode: "TOPUP-123456",
        intervalMs: 1000,
        maxAttempts: 5,
        onSuccess,
      }),
    );

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("VERIFYING");
    expect(result.current.pollCount).toBe(1);

    // Advance to next poll (1000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.status).toBe("SUCCESS");
    expect(result.current.order?.status).toBe("PAID");
    expect(result.current.isLoading).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID" }));
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("handles FAILED order status and terminates polling", async () => {
    vi.spyOn(billingApi, "getTopUpOrderByCode").mockResolvedValueOnce(mockOrder("FAILED"));

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        orderCode: "TOPUP-123456",
        intervalMs: 1000,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe("FAILED");
    expect(result.current.isLoading).toBe(false);
  });

  it("reaches maxAttempts while PENDING and sets TIMEOUT (does NOT conclude failure)", async () => {
    // Keeps returning PENDING
    vi.spyOn(billingApi, "getTopUpOrderByCode").mockResolvedValue(mockOrder("PENDING"));

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        orderCode: "TOPUP-123456",
        intervalMs: 1000,
        maxAttempts: 3,
      }),
    );

    // Attempt 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe("VERIFYING");

    // Attempt 2
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe("VERIFYING");

    // Attempt 3 -> hits maxAttempts
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Acceptance Criteria: Timeout must NOT be concluded as FAILED!
    expect(result.current.status).toBe("TIMEOUT");
    expect(result.current.isLoading).toBe(false);
  });
});
