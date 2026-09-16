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
