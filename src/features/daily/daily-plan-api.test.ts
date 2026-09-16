import { beforeEach, describe, expect, it, vi } from "vitest";
import { dailyPlanApi } from "./daily-plan-api";

const emptyResponse = {
  dailyPlanItemId: "item-1",
  steps: [],
  progress: {
    requiredCount: 0,
    completedRequiredCount: 0,
    completionPercentage: 0,
    allRequiredStepsCompleted: false,
  },
};

describe("dailyPlanApi task steps", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: emptyResponse }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("sends the planned entity version when deleting a step", async () => {
    await dailyPlanApi.deleteTaskStep("plan-1", "version-1", "item-1", "step-1", 7);

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/steps/step-1?entityVersion=7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("sends the runtime state version when checking a step", async () => {
    await dailyPlanApi.setTaskStepCompletion("plan-1", "version-1", "item-1", "step-1", true, 4);

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/steps/step-1/completion",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ completed: true, stateVersion: 4 }),
      }),
    );
  });
});

describe("dailyPlanApi task guidance", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: {} }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );
  });

  it("requests a paginated guidance overview", async () => {
    await dailyPlanApi.getTaskGuidanceOverview("plan-1", "version-1", "item-1", 2, 5);

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/guidance?page=2&size=5",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("requests an exact guidance revision and the current execution", async () => {
    await dailyPlanApi.getTaskGuidanceRevision(
      "plan-1",
      "version-1",
      "item-1",
      "revision-1",
    );
    await dailyPlanApi.getCurrentTaskGuidanceExecution("plan-1", "version-1", "item-1");

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/guidance/revision-1",
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/guidance/execution/current",
      expect.any(Object),
    );
  });

  it("queues initial generation with an idempotency key", async () => {
    await dailyPlanApi.generateTaskGuidance(
      "plan-1",
      "version-1",
      "item-1",
      "guidance-request-1",
    );

    const request = vi.mocked(fetch).mock.calls[0][1];
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/guidance/generate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe("guidance-request-1");
  });

  it("queues regeneration with bounded adjustment input and an idempotency key", async () => {
    const input = { adjustmentInstruction: "Dùng ví dụ Java ngắn hơn." };

    await dailyPlanApi.regenerateTaskGuidance(
      "plan-1",
      "version-1",
      "item-1",
      input,
      "guidance-request-2",
    );

    const request = vi.mocked(fetch).mock.calls[0][1];
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/guidance/regenerate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe("guidance-request-2");
  });
});
