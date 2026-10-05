import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DailyPlanItem, DailyTaskStatus } from "@/types/api";
import { DailyPlanKanbanBoard } from "./daily-plan-kanban-board";

function item(id: string, title: string, status: DailyTaskStatus): DailyPlanItem {
  return {
    id,
    versionId: "version-1",
    category: "PRACTICE",
    title,
    plannedMinutes: 30,
    orderIndex: 0,
    status,
    completionPercentage: status === "COMPLETED" ? 100 : status === "PARTIALLY_COMPLETED" ? 40 : 0,
    createdAt: "2026-10-05T00:00:00Z",
    steps: [],
    stepProgress: {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: true,
    },
  };
}

function renderBoard() {
  const callbacks = {
    onStart: vi.fn(),
    onRequestOutcome: vi.fn(),
    onOpenSteps: vi.fn(),
    onHistory: vi.fn(),
    onPomodoro: vi.fn(),
  };
  const items = [
    item("waiting", "Task waiting", "NOT_STARTED"),
    item("learning", "Task learning", "IN_PROGRESS"),
    item("done", "Task done", "COMPLETED"),
    item("partial", "Task partial", "PARTIALLY_COMPLETED"),
    item("skipped", "Task skipped", "SKIPPED"),
  ];

  render(<DailyPlanKanbanBoard items={items} executable {...callbacks} />);
  return { callbacks, items };
}

describe("DailyPlanKanbanBoard", () => {
  it("groups persisted task states into the four presentation columns", () => {
    renderBoard();

    expect(screen.getByRole("region", { name: "Chưa bắt đầu: 1 nhiệm vụ" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Đang học: 1 nhiệm vụ" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Hoàn thành: 1 nhiệm vụ" })).not.toBeNull();
    expect(screen.getByRole("region", { name: "Chưa hoàn tất: 2 nhiệm vụ" })).not.toBeNull();
  });

  it("offers accessible buttons for starting and recording outcomes", () => {
    const { callbacks, items } = renderBoard();
    const waitingCard = screen.getByText("Task waiting").closest("article");
    const learningCard = screen.getByText("Task learning").closest("article");
    expect(waitingCard).not.toBeNull();
    expect(learningCard).not.toBeNull();

    fireEvent.click(within(waitingCard!).getByRole("button", { name: "Bắt đầu" }));
    expect(callbacks.onStart).toHaveBeenCalledWith(items[0]);

    fireEvent.click(within(learningCard!).getByRole("button", { name: "Hoàn thành" }));
    expect(callbacks.onRequestOutcome).toHaveBeenCalledWith(items[1], "COMPLETED");

    fireEvent.click(within(learningCard!).getByRole("button", { name: "Chưa hoàn tất" }));
    expect(callbacks.onRequestOutcome).toHaveBeenCalledWith(items[1], "PARTIALLY_COMPLETED");
  });

  it("keeps terminal tasks read-only and routes them to progress history", () => {
    const { callbacks, items } = renderBoard();
    const completedCard = screen.getByText("Task done").closest("article");
    expect(completedCard).not.toBeNull();

    expect(within(completedCard!).queryByRole("button", { name: "Hoàn thành" })).toBeNull();
    expect(
      (
        within(completedCard!).getByRole("button", {
          name: /Kéo nhiệm vụ/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.click(within(completedCard!).getByRole("button", { name: "Xem lịch sử" }));
    expect(callbacks.onHistory).toHaveBeenCalledWith(items[2]);
  });
});
