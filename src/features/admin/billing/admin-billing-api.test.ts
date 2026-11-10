import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api-client";
import { adminBillingApi, type AdminCreditRate } from "./admin-billing-api";
import { category, integer } from "./billing-form-utils";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

describe("ADMIN billing contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the selected and replaced rate versions when activating", async () => {
    const item: AdminCreditRate = {
      id: "new",
      version: 2,
      purpose: "DAILY_PLAN_GENERATION",
      modelCategory: null,
      creditCost: 8,
      status: "ARCHIVED",
      effectiveFrom: "2026-10-11T00:00:00Z",
    };
    await adminBillingApi.rateStatus(item, "ACTIVE", { ...item, id: "old", version: 4 });
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/billing/ai-rates/new/status", {
      method: "PATCH",
      body: JSON.stringify({
        version: 2,
        status: "ACTIVE",
        replacesRateId: "old",
        replacesRateVersion: 4,
      }),
    });
  });

  it("retains adjustment identity and expected wallet version", async () => {
    const input = { delta: -5, reason: "Correction", version: 7 };
    await adminBillingApi.adjust("owner", "same-request", input);
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/billing/wallets/owner/adjustments", {
      method: "POST",
      headers: { "Idempotency-Key": "same-request" },
      body: JSON.stringify(input),
    });
  });

  it("encodes lookup and paginated filters", async () => {
    await adminBillingApi.lookup("user+test@example.com");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/billing/wallets/lookup?account=user%2Btest%40example.com",
    );
    await adminBillingApi.rates(2, "ACTIVE", "QUIZ_GENERATION");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/billing/ai-rates?page=2&size=20&status=ACTIVE&purpose=QUIZ_GENERATION",
      { signal: undefined },
    );
  });

  it("rejects fractional or unsafe numbers and normalizes optional categories", () => {
    expect(integer("1.5")).toBeNull();
    expect(integer("9007199254740992")).toBeNull();
    expect(integer("-1")).toBeNull();
    expect(integer("0", 1)).toBeNull();
    expect(integer("12", 1)).toBe(12);
    expect(category(" premium ")).toBe("PREMIUM");
    expect(category(" ")).toBeNull();
  });
});
