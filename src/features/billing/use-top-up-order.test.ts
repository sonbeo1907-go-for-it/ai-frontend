import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTopUpOrder } from "./use-top-up-order";
import { billingApi, ApiClientError } from "@/lib/api-client";
import type { CreditPackageResponse, TopUpOrderResponse } from "@/types/api";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    billingApi: {
      getPackages: vi.fn(),
      createTopUpOrder: vi.fn(),
      getTopUpOrder: vi.fn(),
    },
  };
});

describe("useTopUpOrder", () => {
  const mockPackages: CreditPackageResponse[] = [
    {
      id: "pkg-1",
      packageCode: "AI_STARTER_50K",
      name: "Gói Khởi Đầu",
      priceVnd: 50000,
      baseCredits: 5000,
      bonusCredits: 0,
      totalCredits: 5000,
      status: "ACTIVE",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches active packages on mount", async () => {
    vi.mocked(billingApi.getPackages).mockResolvedValueOnce(mockPackages);

    const { result } = renderHook(() => useTopUpOrder());

    expect(result.current.loadingPackages).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingPackages).toBe(false);
    });

    expect(result.current.packages).toEqual(mockPackages);
    expect(result.current.packageError).toBeNull();
  });

  it("creates a top-up order and redirects to checkoutUrl", async () => {
    vi.mocked(billingApi.getPackages).mockResolvedValueOnce(mockPackages);

    const mockOrder: TopUpOrderResponse = {
      id: "order-123",
      orderCode: "TOPUP-123",
      packageCode: "AI_STARTER_50K",
      packageName: "Gói Khởi Đầu",
      priceVnd: 50000,
      baseCredits: 5000,
      bonusCredits: 0,
      totalCredits: 5000,
      status: "PENDING",
      currency: "VND",
      paymentProvider: "VNPAY",
      checkoutUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?txnRef=TOPUP-123",
      expiresAt: "2026-10-08T16:00:00Z",
      createdAt: "2026-10-08T15:45:00Z",
    };

    vi.mocked(billingApi.createTopUpOrder).mockResolvedValueOnce(mockOrder);

    const { result } = renderHook(() => useTopUpOrder());

    await act(async () => {
      await Promise.resolve();
    });

    let created: TopUpOrderResponse | null = null;
    await act(async () => {
      created = await result.current.purchasePackage("pkg-1");
    });

    expect(billingApi.createTopUpOrder).toHaveBeenCalledWith(
      "pkg-1",
      expect.any(String),
    );
    expect(created).toEqual(mockOrder);
    expect(result.current.purchaseError).toBeNull();
  });

  it("handles payment provider unavailable error gracefully", async () => {
    vi.mocked(billingApi.getPackages).mockResolvedValueOnce(mockPackages);

    vi.mocked(billingApi.createTopUpOrder).mockRejectedValueOnce(
      new ApiClientError({
        status: 503,
        code: "PAYMENT_PROVIDER_UNAVAILABLE",
        message: "Payment provider is currently unavailable",
      }),
    );

    const { result } = renderHook(() => useTopUpOrder());

    await act(async () => {
      await Promise.resolve();
    });

    let created: TopUpOrderResponse | null = null;
    await act(async () => {
      created = await result.current.purchasePackage("pkg-1");
    });

    expect(created).toBeNull();
    expect(result.current.purchaseError).toContain(
      "Cổng thanh toán hiện đang tạm thời gián đoạn.",
    );
  });
});
