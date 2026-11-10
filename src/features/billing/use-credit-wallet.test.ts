import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCreditWallet } from "./use-credit-wallet";
import { billingApi } from "@/lib/api-client";

describe("useCreditWallet Hook (US-PAY-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and initializes wallet data on mount", async () => {
    vi.spyOn(billingApi, "getWallet").mockResolvedValueOnce({
      id: "wallet-hook-1",
      availableCredits: 1000,
      reservedCredits: 0,
    });

    const { result } = renderHook(() => useCreditWallet());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.wallet).toEqual({
      id: "wallet-hook-1",
      availableCredits: 1000,
      reservedCredits: 0,
    });
    expect(result.current.error).toBeNull();
  });

  it("refreshes wallet data when refresh is called", async () => {
    const getWalletSpy = vi
      .spyOn(billingApi, "getWallet")
      .mockResolvedValueOnce({
        id: "wallet-hook-1",
        availableCredits: 1000,
        reservedCredits: 0,
      })
      .mockResolvedValueOnce({
        id: "wallet-hook-1",
        availableCredits: 1200,
        reservedCredits: 50,
      });

    const { result } = renderHook(() => useCreditWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.wallet?.availableCredits).toBe(1200);
    expect(result.current.wallet?.reservedCredits).toBe(50);
    expect(getWalletSpy).toHaveBeenCalledTimes(2);
  });
});
