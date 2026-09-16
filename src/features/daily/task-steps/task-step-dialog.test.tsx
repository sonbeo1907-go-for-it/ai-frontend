import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/providers/toast-provider";
import type { DailyPlanItem, DailyPlanTaskStepsResponse } from "@/types/api";
import { TaskStepDialog } from "./task-step-dialog";

const item: DailyPlanItem = {
  id: "item-1",
  versionId: "version-1",
  category: "PRACTICE",
  title: "Thực hành Optional",
  plannedMinutes: 30,
  orderIndex: 0,
  status: "NOT_STARTED",
  createdAt: "2026-09-15T00:00:00Z",
  learningUnitId: "unit-1",
  learningUnitTitle: "Sử dụng Optional an toàn",
  parentTopicTitle: "Java hiện đại",
  steps: [
    {
      id: "step-1",
      entityVersion: 3,
      dailyPlanItemId: "item-1",
      title: "So sánh orElse và orElseGet",
      guidance: "Viết một fallback có side effect.",
      orderIndex: 0,
      estimatedMinutes: 10,
      required: true,
      completed: false,
      stateVersion: 2,
    },
  ],
  stepProgress: {
    requiredCount: 1,
    completedRequiredCount: 0,
    completionPercentage: 0,
    allRequiredStepsCompleted: false,
  },
};

const completedResponse: DailyPlanTaskStepsResponse = {
  dailyPlanItemId: "item-1",
  steps: [{ ...item.steps[0], completed: true, stateVersion: 3 }],
  progress: {
    requiredCount: 1,
    completedRequiredCount: 1,
    completionPercentage: 100,
    allRequiredStepsCompleted: true,
  },
};

function renderDialog(
  onStepsChanged = vi.fn(),
  options: { item?: DailyPlanItem; editable?: boolean; executable?: boolean } = {},
) {
  render(
    <ToastProvider>
      <TaskStepDialog
        open
        planId="plan-1"
        versionId="version-1"
        item={options.item ?? item}
        editable={options.editable ?? false}
        executable={options.executable ?? true}
        onClose={vi.fn()}
        onStepsChanged={onStepsChanged}
        onRecordOutcome={vi.fn()}
      />
    </ToastProvider>,
  );
}

describe("TaskStepDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses steps embedded in the Daily Plan item without fetching on open", () => {
    renderDialog();

    expect(screen.getByText("So sánh orElse và orElseGet")).not.toBeNull();
    expect(screen.getByText("Đơn vị học: Sử dụng Optional an toàn")).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("updates runtime completion with the observed state version", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: completedResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const onStepsChanged = vi.fn();
    renderDialog(onStepsChanged);

    fireEvent.click(screen.getByRole("checkbox", { name: /Hoàn thành/ }));

    await waitFor(() => expect(onStepsChanged).toHaveBeenCalledWith(completedResponse));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/steps/step-1/completion",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ completed: true, stateVersion: 2 }),
      }),
    );
    expect(screen.getByText("Ghi kết quả nhiệm vụ")).not.toBeNull();
  });

  it("adds a manual step to a DRAFT without reloading the whole plan", async () => {
    const draftItem: DailyPlanItem = {
      ...item,
      steps: [],
      stepProgress: {
        requiredCount: 0,
        completedRequiredCount: 0,
        completionPercentage: 0,
        allRequiredStepsCompleted: false,
      },
    };
    const createdResponse: DailyPlanTaskStepsResponse = {
      dailyPlanItemId: draftItem.id,
      steps: [{ ...item.steps[0], completed: false, stateVersion: null }],
      progress: {
        requiredCount: 1,
        completedRequiredCount: 0,
        completionPercentage: 0,
        allRequiredStepsCompleted: false,
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: createdResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const onStepsChanged = vi.fn();
    renderDialog(onStepsChanged, { item: draftItem, editable: true, executable: false });

    fireEvent.click(screen.getByRole("button", { name: "Thêm bước" }));
    fireEvent.change(screen.getByLabelText("Tên bước"), {
      target: { value: "So sánh orElse và orElseGet" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm bước" }));

    await waitFor(() => expect(onStepsChanged).toHaveBeenCalledWith(createdResponse));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/steps",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
