import { StrictMode, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeMapResponse } from "@/types/api";
import { fetchKnowledgeMap, fetchWeakTopicsTimeline } from "../report-api";
import { useLazyReports, type ReportTab } from "./use-lazy-reports";

vi.mock("../report-api", () => ({
  fetchKnowledgeMap: vi.fn(),
  fetchWeakTopicsTimeline: vi.fn(),
}));

const mapRequest = vi.mocked(fetchKnowledgeMap);
const timelineRequest = vi.mocked(fetchWeakTopicsTimeline);

function mapFor(roadmapId: string | null): KnowledgeMapResponse {
  return {
    roadmapId,
    roadmapTitle: roadmapId,
    totalMilestones: 0,
    totalTopics: 0,
    masteredTopics: 0,
    totalLearningUnits: 0,
    masteredLearningUnits: 0,
    masteryPercentage: 0,
    milestones: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderReports(tab: ReportTab = "KNOWLEDGE_MAP", roadmapId = "") {
  return renderHook(
    (props: { tab: ReportTab; roadmapId: string }) => useLazyReports(props.tab, props.roadmapId),
    { initialProps: { tab, roadmapId } },
  );
}

describe("useLazyReports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mapRequest.mockResolvedValue(mapFor("roadmap-1"));
    timelineRequest.mockResolvedValue([]);
  });

  it("loads only the map initially, aliases its default Roadmap, and caches an empty Timeline", async () => {
    const { result, rerender } = renderReports();
    await waitFor(() => expect(result.current.map.status).toBe("success"));
    expect(mapRequest).toHaveBeenCalledTimes(1);
    expect(timelineRequest).not.toHaveBeenCalled();

    rerender({ tab: "KNOWLEDGE_MAP", roadmapId: "roadmap-1" });
    expect(result.current.map.data?.roadmapId).toBe("roadmap-1");
    expect(mapRequest).toHaveBeenCalledTimes(1);

    rerender({ tab: "WEAK_TOPICS", roadmapId: "roadmap-1" });
    await waitFor(() => expect(result.current.timeline.status).toBe("success"));
    expect(timelineRequest).toHaveBeenCalledWith("roadmap-1", expect.any(AbortSignal));
    rerender({ tab: "KNOWLEDGE_MAP", roadmapId: "roadmap-1" });
    rerender({ tab: "WEAK_TOPICS", roadmapId: "roadmap-1" });
    expect(timelineRequest).toHaveBeenCalledTimes(1);
    expect(result.current.timeline.data).toEqual([]);
  });

  it("resolves the default Roadmap before opening its Timeline, without querying all Roadmaps", async () => {
    const pending = deferred<KnowledgeMapResponse>();
    mapRequest.mockReturnValue(pending.promise);
    const { result, rerender } = renderReports();
    rerender({ tab: "WEAK_TOPICS", roadmapId: "" });
    expect(timelineRequest).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);

    await act(async () => pending.resolve(mapFor("default-roadmap")));
    await waitFor(() => expect(result.current.timeline.status).toBe("success"));
    expect(timelineRequest).toHaveBeenCalledWith("default-roadmap", expect.any(AbortSignal));
    expect(mapRequest).toHaveBeenCalledTimes(1);
  });

  it("returns an empty Timeline without fetching when there is no default Roadmap", async () => {
    mapRequest.mockResolvedValue(mapFor(null));
    const { result, rerender } = renderReports();
    await waitFor(() => expect(result.current.map.status).toBe("success"));
    rerender({ tab: "WEAK_TOPICS", roadmapId: "" });
    expect(result.current.loading).toBe(false);
    expect(result.current.timeline.data).toEqual([]);
    expect(timelineRequest).not.toHaveBeenCalled();
  });

  it("keeps the map available while Timeline is slow or fails, and retries only Timeline", async () => {
    const pending = deferred<never[]>();
    timelineRequest.mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderReports();
    await waitFor(() => expect(result.current.map.status).toBe("success"));
    rerender({ tab: "WEAK_TOPICS", roadmapId: "" });
    rerender({ tab: "KNOWLEDGE_MAP", roadmapId: "" });
    expect(result.current.loading).toBe(false);
    expect(result.current.map.data?.roadmapId).toBe("roadmap-1");

    await act(async () => pending.reject(new Error("Timeline failed")));
    expect(result.current.error).toBe("");
    rerender({ tab: "WEAK_TOPICS", roadmapId: "" });
    expect(result.current.error).toBe("Timeline failed");
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.timeline.status).toBe("success"));
    expect(mapRequest).toHaveBeenCalledTimes(1);
    expect(timelineRequest).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous Roadmap request and ignores its late response", async () => {
    const oldRequest = deferred<KnowledgeMapResponse>();
    const newRequest = deferred<KnowledgeMapResponse>();
    mapRequest.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    const { result, rerender } = renderReports("KNOWLEDGE_MAP", "roadmap-A");
    const oldSignal = mapRequest.mock.calls[0][1];
    rerender({ tab: "KNOWLEDGE_MAP", roadmapId: "roadmap-B" });
    expect(oldSignal?.aborted).toBe(true);
    expect(result.current.map.data).toBeNull();
    await act(async () => newRequest.resolve(mapFor("roadmap-B")));
    await act(async () => oldRequest.resolve(mapFor("roadmap-A")));
    expect(result.current.map.data?.roadmapId).toBe("roadmap-B");
    expect(result.current.error).toBe("");

    rerender({ tab: "KNOWLEDGE_MAP", roadmapId: "roadmap-A" });
    expect(mapRequest).toHaveBeenCalledTimes(3);
  });

  it("loads only Timeline when changing an explicit Roadmap on that tab", async () => {
    const { result, rerender } = renderReports("WEAK_TOPICS", "roadmap-A");
    await waitFor(() => expect(result.current.timeline.status).toBe("success"));
    rerender({ tab: "WEAK_TOPICS", roadmapId: "roadmap-B" });
    await waitFor(() => expect(result.current.timeline.status).toBe("success"));
    expect(mapRequest).not.toHaveBeenCalled();
    expect(timelineRequest).toHaveBeenCalledTimes(2);
    expect(timelineRequest.mock.calls[1][0]).toBe("roadmap-B");
  });

  it("keeps existing data visible during refresh and preserves it if refreshing fails", async () => {
    const { result } = renderReports();
    await waitFor(() => expect(result.current.map.status).toBe("success"));
    const refreshRequest = deferred<KnowledgeMapResponse>();
    mapRequest.mockReturnValueOnce(refreshRequest.promise);
    act(() => result.current.refresh());
    expect(result.current.loading).toBe(true);
    expect(result.current.map.data?.roadmapId).toBe("roadmap-1");
    await act(async () => refreshRequest.reject(new Error("Refresh failed")));
    expect(result.current.map.data?.roadmapId).toBe("roadmap-1");
    expect(result.current.error).toBe("Refresh failed");
    expect(timelineRequest).not.toHaveBeenCalled();
  });

  it("reuses the live request through Strict Mode and aborts it after unmount", async () => {
    mapRequest.mockReturnValue(new Promise(() => {}));
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { unmount } = renderHook(() => useLazyReports("KNOWLEDGE_MAP", ""), { wrapper });
    expect(mapRequest).toHaveBeenCalledTimes(1);
    const signal = mapRequest.mock.calls[0][1];
    expect(signal?.aborted).toBe(false);
    unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
