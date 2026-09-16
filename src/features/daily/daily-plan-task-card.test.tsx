import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DailyPlanItem } from "@/types/api";
import { DailyPlanTaskCard } from "./daily-plan-task-card";

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
      entityVersion: 0,
      dailyPlanItemId: "item-1",
      title: "So sánh orElse và orElseGet",
      orderIndex: 0,
      estimatedMinutes: 10,
      required: true,
      completed: true,
      stateVersion: 1,
    },
    {
      id: "step-2",
      entityVersion: 0,
      dailyPlanItemId: "item-1",
      title: "Viết ví dụ map và flatMap",
      orderIndex: 1,
      estimatedMinutes: 15,
      required: true,
      completed: false,
      stateVersion: 0,
    },
  ],
  stepProgress: {
    requiredCount: 2,
    completedRequiredCount: 1,
    completionPercentage: 50,
    allRequiredStepsCompleted: false,
  },
};

describe("DailyPlanTaskCard", () => {
  it("shows checklist progress and opens the step detail", () => {
    const onOpenSteps = vi.fn();
    const noop = vi.fn();

    render(
      <DailyPlanTaskCard
        item={item}
        editable={false}
        executable
        onEdit={noop}
        onDelete={noop}
        onProgress={noop}
        onHistory={noop}
        onPomodoro={noop}
        onOpenSteps={onOpenSteps}
      />,
    );

    expect(screen.getByText("1/2 bước bắt buộc")).not.toBeNull();
    expect(screen.getByText("Đơn vị học: Sử dụng Optional an toàn")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Mở các bước thực hiện/ }));
    expect(onOpenSteps).toHaveBeenCalledOnce();
  });
});
