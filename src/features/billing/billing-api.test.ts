import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAiPrices, fetchCreditTransactions, fetchCreditWallet } from "./billing-api";

const mockApiRequest = vi.fn();

vi.mock("@/lib/api-client", () => {
  return {
    billingApi: {
      getWallet: () => mockApiRequest("/api/v1/billing/wallet"),
      getAiPrices: () => mockApiRequest("/api/v1/billing/ai-prices"),
      getTransactions: (params?: { type?: string; from?: string; to?: string; page?: number; size?: number }) => {
        const search = new URLSearchParams();
        if (params?.type) search.set("entryType", params.type);
        if (params?.from) search.set("fromDate", params.from);
        if (params?.to) search.set("toDate", params.to);
        if (params?.page !== undefined) search.set("page", String(params.page));
        if (params?.size !== undefined) search.set("size", String(params.size));
        const query = search.toString();
        return mockApiRequest(query ? `/api/v1/billing/transactions?${query}` : "/api/v1/billing/transactions");
      },
    },
  };
});

describe("billing-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchCreditWallet calls /api/v1/billing/wallet", async () => {
    mockApiRequest.mockResolvedValueOnce({
      id: "w1",
      availableCredits: 40,
      reservedCredits: 10,
    });

    const result = await fetchCreditWallet();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/billing/wallet");
    expect(result.availableCredits).toBe(40);
    expect(result.reservedCredits).toBe(10);
  });

  it("fetchAiPrices calls /api/v1/billing/ai-prices", async () => {
    mockApiRequest.mockResolvedValueOnce([
      { id: "r1", purpose: "ROADMAP_GENERATION", creditCost: 10 },
      { id: "r2", purpose: "DAILY_PLAN_GENERATION", creditCost: 5 },
    ]);

    const result = await fetchAiPrices();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/billing/ai-prices");
    expect(result).toHaveLength(2);
    expect(result[0].purpose).toBe("ROADMAP_GENERATION");
    expect(result[0].creditCost).toBe(10);
  });

  it("fetchCreditTransactions calls /api/v1/billing/transactions with query params", async () => {
    mockApiRequest.mockResolvedValueOnce({
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
          referenceId: "exec-1",
          description: "Hoàn lại credit giữ chỗ do thao tác AI không thành công",
          status: "RELEASED",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });

    const result = await fetchCreditTransactions({
      type: "RELEASE_RESERVE",
      from: "2026-10-01",
      to: "2026-10-09",
      page: 0,
      size: 20,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/billing/transactions?entryType=RELEASE_RESERVE&fromDate=2026-10-01&toDate=2026-10-09&page=0&size=20",
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].entryType).toBe("RELEASE_RESERVE");
    expect(result.content[0].status).toBe("RELEASED");
    expect(result.content[0].description).toContain("Hoàn lại credit giữ chỗ");
  });
});
