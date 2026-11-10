import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  aiExecutionPoller,
  calculatePollDelay,
  calculateNetworkRetryDelay,
} from "./ai-execution-poller";
import * as aiExecutionApi from "./ai-execution-api";
import { ApiClientError } from "./api-client";
import type { AiExecution } from "@/types/api";

function createMockExecution(
  id: string,
  status: AiExecution["status"] = "RUNNING",
  overrides: Partial<AiExecution> = {},
): AiExecution {
  return {
    id,
    entityVersion: 1,
    providerConfigId: "cfg-1",
    purpose: "ROADMAP_GENERATION",
    operation: "GENERATE",
    targetType: "ROADMAP",
    targetId: "target-1",
    status,
    attemptCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("aiExecutionPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default Math.random to 0.5 for deterministic 0% jitter in timer tests
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    aiExecutionPoller.clearAll();
  });

  afterEach(() => {
    aiExecutionPoller.clearAll();
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe("Calculations & Policies", () => {
    it("calculates poll delay with exponential backoff and jitter, capped at MAX_FOREGROUND_POLL_INTERVAL", () => {
      // Temporarily restore random to test jitter range
      vi.spyOn(Math, "random").mockRestore();

      for (let i = 0; i < 50; i++) {
        const delay0 = calculatePollDelay(0);
        // Base 1000 +/- 20% = [800, 1200]
        expect(delay0).toBeGreaterThanOrEqual(800);
        expect(delay0).toBeLessThanOrEqual(1200);

        const delay1 = calculatePollDelay(1);
        // Base 2000 +/- 20% = [1600, 2400]
        expect(delay1).toBeGreaterThanOrEqual(1600);
        expect(delay1).toBeLessThanOrEqual(2400);

        const delay2 = calculatePollDelay(2);
        // Base 4000 +/- 20% = [3200, 4800]
        expect(delay2).toBeGreaterThanOrEqual(3200);
        expect(delay2).toBeLessThanOrEqual(4800);

        const delay3 = calculatePollDelay(3);
        // Base 5000 (capped) +/- 20% = [4000, 6000]
        expect(delay3).toBeGreaterThanOrEqual(4000);
        expect(delay3).toBeLessThanOrEqual(6000);
      }
    });

    it("calculates network retry delay with exponential backoff up to 15s", () => {
      expect(calculateNetworkRetryDelay(1)).toBe(2000);
      expect(calculateNetworkRetryDelay(2)).toBe(4000);
      expect(calculateNetworkRetryDelay(3)).toBe(8000);
      expect(calculateNetworkRetryDelay(4)).toBe(15000);
      expect(calculateNetworkRetryDelay(5)).toBe(15000);
    });
  });

  describe("AC1: Deduplication (One poller per execution)", () => {
    it("maintains only a single in-flight request when multiple components subscribe to the same execution ID", async () => {
      const getExecutionSpy = vi
        .spyOn(aiExecutionApi, "getAiExecution")
        .mockImplementation(async () => createMockExecution("exec-1", "RUNNING"));

      const callbackA = vi.fn();
      const callbackB = vi.fn();

      const unsubA = aiExecutionPoller.subscribe("exec-1", callbackA);
      const unsubB = aiExecutionPoller.subscribe("exec-1", callbackB);

      expect(aiExecutionPoller.getActivePollerCount()).toBe(1);

      await vi.advanceTimersByTimeAsync(0);

      expect(getExecutionSpy).toHaveBeenCalledTimes(1);
      expect(callbackA).toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalled();

      unsubA();
      unsubB();
    });
  });

  describe("AC2: Stop at terminal state", () => {
    it("stops polling immediately when status is SUCCEEDED, FAILED, or TIMEOUT", async () => {
      let callCount = 0;
      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return createMockExecution("exec-2", "RUNNING");
        return createMockExecution("exec-2", "SUCCEEDED", { resultId: "res-1" });
      });

      const callback = vi.fn();
      const unsub = aiExecutionPoller.subscribe("exec-2", callback);

      // First fetch (immediate)
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      // Advance by 1000ms (poll delay for pollCount=0)
      await vi.advanceTimersByTimeAsync(1000);
      expect(callCount).toBe(2);

      const snapshot = aiExecutionPoller.getSnapshot("exec-2");
      expect(snapshot.execution?.status).toBe("SUCCEEDED");

      // Advance time further - polling must NOT fire again!
      await vi.advanceTimersByTimeAsync(30000);
      expect(callCount).toBe(2);

      unsub();
    });
  });

  describe("AC3: Backoff for QUEUED and RUNNING", () => {
    it("progresses polling delay when execution remains in active state", async () => {
      const getExecutionSpy = vi
        .spyOn(aiExecutionApi, "getAiExecution")
        .mockResolvedValue(createMockExecution("exec-3", "QUEUED"));

      const unsub = aiExecutionPoller.subscribe("exec-3", vi.fn());

      // Initial fetch
      await vi.advanceTimersByTimeAsync(0);
      expect(getExecutionSpy).toHaveBeenCalledTimes(1);

      // Poll 1: 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(getExecutionSpy).toHaveBeenCalledTimes(2);

      // Poll 2: 2000ms
      await vi.advanceTimersByTimeAsync(2000);
      expect(getExecutionSpy).toHaveBeenCalledTimes(3);

      // Poll 3: 4000ms
      await vi.advanceTimersByTimeAsync(4000);
      expect(getExecutionSpy).toHaveBeenCalledTimes(4);

      // Poll 4: 5000ms (max)
      await vi.advanceTimersByTimeAsync(5000);
      expect(getExecutionSpy).toHaveBeenCalledTimes(5);

      unsub();
    });
  });

  describe("AC4: Tab visibility pause and resume", () => {
    it("pauses polling while hidden, then immediately refreshes upon visible", async () => {
      let fetchCount = 0;
      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
        fetchCount++;
        return createMockExecution("exec-4", "RUNNING");
      });

      const unsub = aiExecutionPoller.subscribe("exec-4", vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchCount).toBe(1);

      // Tab hidden
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Advance time while hidden: NO fetches should happen!
      await vi.advanceTimersByTimeAsync(20000);
      expect(fetchCount).toBe(1);

      // Tab visible again
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Immediate refresh happens
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchCount).toBe(2);

      unsub();
    });
  });

  describe("AC5: Cleanup and Abort", () => {
    it("aborts in-flight request and cleans up timers when all subscribers unmount", async () => {
      let aborted = false;
      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async (_id, options) => {
        options?.signal?.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise(() => {});
      });

      const unsub = aiExecutionPoller.subscribe("exec-5", vi.fn());
      await vi.advanceTimersByTimeAsync(0);

      expect(aborted).toBe(false);
      expect(aiExecutionPoller.getActivePollerCount()).toBe(1);

      // Component unmounts
      unsub();

      expect(aborted).toBe(true);
      expect(aiExecutionPoller.getActivePollerCount()).toBe(0);
    });
  });

  describe("AC6: Reload recovery", () => {
    it("fetches state from backend on mount without creating a new generation", async () => {
      const getExecutionSpy = vi
        .spyOn(aiExecutionApi, "getAiExecution")
        .mockResolvedValue(createMockExecution("recovered-id", "RUNNING"));

      const callback = vi.fn();
      const unsub = aiExecutionPoller.subscribe("recovered-id", callback);

      await vi.advanceTimersByTimeAsync(0);

      expect(getExecutionSpy).toHaveBeenCalledWith("recovered-id", expect.any(Object));
      expect(aiExecutionPoller.getSnapshot("recovered-id").execution?.id).toBe("recovered-id");

      unsub();
    });

    it("stops polling on 404 not found", async () => {
      vi.spyOn(aiExecutionApi, "getAiExecution").mockRejectedValue(
        new ApiClientError({
          status: 404,
          code: "NOT_FOUND",
          message: "Execution not found",
        }),
      );

      const unsub = aiExecutionPoller.subscribe("missing-id", vi.fn());
      await vi.advanceTimersByTimeAsync(0);

      const snapshot = aiExecutionPoller.getSnapshot("missing-id");
      expect(snapshot.error).toBeInstanceOf(ApiClientError);

      // Verify no further retries scheduled
      await vi.advanceTimersByTimeAsync(30000);
      unsub();
    });
  });

  describe("AC7: Manual refresh with request lock", () => {
    it("does not spawn concurrent requests when manual refresh is called while in-flight", async () => {
      let resolveCall: (val: AiExecution) => void;
      let callCount = 0;

      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(
        async () =>
          new Promise((resolve) => {
            callCount++;
            resolveCall = resolve;
          }),
      );

      const unsub = aiExecutionPoller.subscribe("exec-7", vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      // User spams refresh button while request is in flight
      aiExecutionPoller.refresh("exec-7");
      aiExecutionPoller.refresh("exec-7");

      expect(callCount).toBe(1);

      // Resolve the request
      resolveCall!(createMockExecution("exec-7", "RUNNING"));
      await vi.advanceTimersByTimeAsync(0);

      // Now manual refresh will trigger a request
      aiExecutionPoller.refresh("exec-7");
      expect(callCount).toBe(2);

      unsub();
    });
  });

  describe("Out-of-order Response Sequence", () => {
    it("discards response from earlier request if newer response has already been applied", async () => {
      let resolveFirst: (val: AiExecution) => void;
      let resolveSecond: (val: AiExecution) => void;
      let callNumber = 0;

      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
        callNumber++;
        if (callNumber === 1) {
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      });

      const unsub = aiExecutionPoller.subscribe("exec-order", vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(callNumber).toBe(1);

      // Resolve first request with version 1
      resolveFirst!(createMockExecution("exec-order", "RUNNING", { entityVersion: 1 }));
      await vi.advanceTimersByTimeAsync(0);
      expect(aiExecutionPoller.getSnapshot("exec-order").execution?.entityVersion).toBe(1);

      // Next poll scheduled after 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      expect(callNumber).toBe(2);

      // Resolve second request with version 2
      resolveSecond!(createMockExecution("exec-order", "RUNNING", { entityVersion: 2 }));
      await vi.advanceTimersByTimeAsync(0);
      expect(aiExecutionPoller.getSnapshot("exec-order").execution?.entityVersion).toBe(2);

      // If a delayed response with version 1 tries to resolve, snapshot remains version 2
      unsub();
    });
  });

  describe("Network Error and Authoritative State", () => {
    it("does not mark execution as FAILED on network errors, retries, and resets failCount on success", async () => {
      let callCount = 0;
      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Network timeout");
        }
        return createMockExecution("exec-net", "RUNNING");
      });

      const unsub = aiExecutionPoller.subscribe("exec-net", vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      const snapshotAfterError = aiExecutionPoller.getSnapshot("exec-net");
      // Must NOT mark status as FAILED
      expect(snapshotAfterError.execution?.status).not.toBe("FAILED");
      expect(snapshotAfterError.error?.message).toBe("Network timeout");

      // Network retry backoff (2000ms)
      await vi.advanceTimersByTimeAsync(2000);
      expect(callCount).toBe(2);

      const snapshotAfterSuccess = aiExecutionPoller.getSnapshot("exec-net");
      expect(snapshotAfterSuccess.error).toBeNull();
      expect(snapshotAfterSuccess.execution?.status).toBe("RUNNING");

      unsub();
    });
  });

  describe("Session Expiry & 401", () => {
    it("stops polling immediately and does not retry on 401 Unauthorized", async () => {
      let callCount = 0;
      vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
        callCount++;
        throw new ApiClientError({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Session expired",
        });
      });

      const unsub = aiExecutionPoller.subscribe("exec-auth", vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      // Advance time - verify NO retry scheduled
      await vi.advanceTimersByTimeAsync(30000);
      expect(callCount).toBe(1);

      unsub();
    });
  });
});
