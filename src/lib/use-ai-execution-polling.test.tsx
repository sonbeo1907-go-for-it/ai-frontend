import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAiExecutionPolling } from "./use-ai-execution-polling";
import { aiExecutionPoller } from "./ai-execution-poller";
import * as aiExecutionApi from "./ai-execution-api";
import type { AiExecution } from "@/types/api";

function createMockExecution(id: string, status: AiExecution["status"] = "RUNNING"): AiExecution {
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
  };
}

describe("useAiExecutionPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    aiExecutionPoller.clearAll();
  });

  afterEach(() => {
    aiExecutionPoller.clearAll();
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it("returns idle snapshot when executionId is null or undefined", () => {
    const { result } = renderHook(() => useAiExecutionPolling(null));
    expect(result.current.execution).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isPolling).toBe(false);
  });

  it("subscribes to poller and updates execution when backend responds", async () => {
    vi.spyOn(aiExecutionApi, "getAiExecution").mockResolvedValue(
      createMockExecution("hook-1", "RUNNING"),
    );

    const { result } = renderHook(() => useAiExecutionPolling("hook-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.execution?.id).toBe("hook-1");
    expect(result.current.execution?.status).toBe("RUNNING");
  });

  it("exposes refreshStatus to manually refresh the active execution", async () => {
    let callCount = 0;
    vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(async () => {
      callCount++;
      return createMockExecution("hook-2", "RUNNING");
    });

    const { result } = renderHook(() => useAiExecutionPolling("hook-2"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(callCount).toBe(1);

    await act(async () => {
      result.current.refreshStatus();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(callCount).toBe(2);
  });

  it("cleans up subscription on unmount", async () => {
    vi.spyOn(aiExecutionApi, "getAiExecution").mockImplementation(
      async () => new Promise(() => {}),
    );

    const { unmount } = renderHook(() => useAiExecutionPolling("hook-3"));
    expect(aiExecutionPoller.getActivePollerCount()).toBe(1);

    unmount();
    expect(aiExecutionPoller.getActivePollerCount()).toBe(0);
  });
});
