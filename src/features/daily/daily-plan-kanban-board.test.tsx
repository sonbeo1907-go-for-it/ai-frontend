import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DailyPlanItem } from "@/types/api";
import { DailyPlanKanbanBoard } from "./daily-plan-kanban-board";

const mockItems: DailyPlanItem[] = [
  {
    id: "item-1",
    versionId: "version-1",
    category: "NEW_MATERIAL",
    title: "Học Java Generics",
    plannedMinutes: 45,
    orderIndex: 0,
    status: "NOT_STARTED",
    createdAt: "2026-09-15T00:00:00Z",
    steps: [],
    stepProgress: {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: true,
    },
  },
  {
    id: "item-2",
    versionId: "version-1",
    category: "PRACTICE",
    title: "Bài tập Spring Boot Kanban",
    plannedMinutes: 60,
    orderIndex: 1,
    status: "IN_PROGRESS",
    createdAt: "2026-09-15T00:00:00Z",
    steps: [],
    stepProgress: {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: true,
    },
  },
  {
    id: "item-3",
    versionId: "version-1",
    category: "REVIEW",
    title: "Reviewing Java Core",
    plannedMinutes: 30,
    orderIndex: 2,
    status: "REVIEWING",
    createdAt: "2026-09-15T00:00:00Z",
    steps: [],
    stepProgress: {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: true,
    },
  },
  {
    id: "item-4",
    versionId: "version-1",
    category: "REVIEW",
    title: "Ôn tập SQL Joins",
    plannedMinutes: 30,
    orderIndex: 3,
    status: "COMPLETED",
    createdAt: "2026-09-15T00:00:00Z",
    steps: [],
    stepProgress: {
      requiredCount: 0,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: true,
    },
  },
];

describe("DailyPlanKanbanBoard", () => {
  it("renders 4 columns with tasks distributed by status", () => {
    const noop = vi.fn();
    render(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        onMoveStatus={vi.fn()}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
        onProgress={noop}
        onHistory={noop}
        onPomodoro={noop}
        onOpenSteps={noop}
      />,
    );

    // 4 Columns present
    expect(screen.getByRole("heading", { name: "Chưa hoàn thành" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Đang thực hiện" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Đang xem xét" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Hoàn thành" })).not.toBeNull();

    // Tasks present
    expect(screen.getByText("Học Java Generics")).not.toBeNull();
    expect(screen.getByText("Bài tập Spring Boot Kanban")).not.toBeNull();
    expect(screen.getByText("Reviewing Java Core")).not.toBeNull();
    expect(screen.getByText("Ôn tập SQL Joins")).not.toBeNull();
  });

  it("calls onMoveStatus when clicking transition buttons", async () => {
    const onMoveStatus = vi.fn().mockResolvedValue(undefined);
    const noop = vi.fn();

    render(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        onMoveStatus={onMoveStatus}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
        onProgress={noop}
        onHistory={noop}
        onPomodoro={noop}
        onOpenSteps={noop}
      />,
    );

    // In NOT_STARTED task, click "Bắt đầu" -> IN_PROGRESS
    const startButton = screen.getByRole("button", { name: /Bắt đầu/i });
    fireEvent.click(startButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-1", "IN_PROGRESS");

    // In IN_PROGRESS task, click "Xem xét" -> REVIEWING
    const reviewButton = screen.getAllByRole("button", { name: /Xem xét/i })[1];
    fireEvent.click(reviewButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-2", "REVIEWING");
  });

  it("requires quiz completion before moving reviewing task to completed", async () => {
    const onMoveStatus = vi.fn().mockResolvedValue(undefined);
    const onOpenQuiz = vi.fn();
    const noop = vi.fn();

    const { rerender } = render(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        quizPassed={false}
        onMoveStatus={onMoveStatus}
        onOpenQuiz={onOpenQuiz}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
        onProgress={noop}
        onHistory={noop}
        onPomodoro={noop}
        onOpenSteps={noop}
      />,
    );

    // In REVIEWING task when quiz is NOT passed, clicking "Làm Quiz" opens quiz
    const quizButton = screen.getByRole("button", { name: /Làm bài Quiz ngay/i });
    fireEvent.click(quizButton);
    expect(onOpenQuiz).toHaveBeenCalled();
    expect(onMoveStatus).not.toHaveBeenCalledWith("item-3", "COMPLETED");

    // When quiz is passed, "Hoàn thành" button appears and allows moving
    rerender(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        quizPassed={true}
        quizScore={90}
        onMoveStatus={onMoveStatus}
        onOpenQuiz={onOpenQuiz}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
        onProgress={noop}
        onHistory={noop}
        onPomodoro={noop}
        onOpenSteps={noop}
      />,
    );

    const completeButton = screen.getByRole("button", { name: /Hoàn thành/i });
    fireEvent.click(completeButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-3", "COMPLETED");
  });
});
