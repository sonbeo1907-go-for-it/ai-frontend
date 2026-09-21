import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardReport, fetchKnowledgeMap, fetchWeakTopicsTimeline } from "./report-api";

describe("report-api", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: url.includes("weak-topics-timeline") ? [] : {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ),
    );
  });

  it("fetchDashboardReport calls /api/v1/reports/dashboard", async () => {
    await fetchDashboardReport();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/reports/dashboard",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("fetchKnowledgeMap calls /api/v1/reports/knowledge-map with optional roadmapId", async () => {
    await fetchKnowledgeMap();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/reports/knowledge-map",
      expect.objectContaining({ cache: "no-store" }),
    );

    await fetchKnowledgeMap("roadmap-123");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/reports/knowledge-map?roadmapId=roadmap-123",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("fetchWeakTopicsTimeline calls /api/v1/reports/weak-topics-timeline with optional roadmapId", async () => {
    await fetchWeakTopicsTimeline();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/reports/weak-topics-timeline",
      expect.objectContaining({ cache: "no-store" }),
    );

    await fetchWeakTopicsTimeline("roadmap-456");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/reports/weak-topics-timeline?roadmapId=roadmap-456",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
