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
    steps: [
      {
        id: "step-1",
        dailyPlanItemId: "item-3",
        stepIndex: 1,
        title: "Đọc lại lý thuyết",
        guidance: "Tập trung vào Polymorphism",
        estimatedMinutes: 15,
        required: true,
        completed: false,
        createdAt: "2026-09-15T00:00:00Z",
      },
    ],
    stepProgress: {
      requiredCount: 1,
      completedRequiredCount: 0,
      completionPercentage: 0,
      allRequiredStepsCompleted: false,
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

  it("calls onMoveStatus when clicking quick transition buttons", async () => {
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

    // In IN_PROGRESS task, click "Gửi kiểm tra" -> REVIEWING
    const sendReviewButton = screen.getByRole("button", { name: /Gửi kiểm tra/i });
    fireEvent.click(sendReviewButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-2", "REVIEWING");

    // In REVIEWING task, click "Làm tiếp" -> IN_PROGRESS
    const resumeButton = screen.getByRole("button", { name: /Làm tiếp/i });
    fireEvent.click(resumeButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-3", "IN_PROGRESS");
  });

  it("renders board-level review CTA and calls onOpenQuiz when clicked", () => {
    const onOpenQuiz = vi.fn();
    const noop = vi.fn();

    render(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        onMoveStatus={vi.fn()}
        onOpenQuiz={onOpenQuiz}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
      />,
    );

    const ctaButton = screen.getByRole("button", { name: /Bắt đầu kiểm tra cuối ngày/i });
    expect(ctaButton).not.toBeNull();
    fireEvent.click(ctaButton);
    expect(onOpenQuiz).toHaveBeenCalledTimes(1);
  });

  it("handles manual fallback completion for locked reviewing task", async () => {
    const onMoveStatus = vi.fn().mockResolvedValue(undefined);
    const noop = vi.fn();

    render(
      <DailyPlanKanbanBoard
        items={mockItems}
        editable={false}
        executable={true}
        quizPassed={false}
        onMoveStatus={onMoveStatus}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
      />,
    );

    // Locked reviewing task shows "Hoàn thành thủ công" button
    const manualBtn = screen.getByRole("button", { name: /Hoàn thành thủ công/i });
    fireEvent.click(manualBtn);

    // Modal opens
    expect(screen.getByRole("heading", { name: "Hoàn thành nhiệm vụ thủ công" })).not.toBeNull();

    // Confirm button inside modal
    const confirmBtn = screen.getByRole("button", { name: /Xác nhận hoàn thành/i });
    fireEvent.click(confirmBtn);

    expect(onMoveStatus).toHaveBeenCalledWith(
      "item-3",
      "COMPLETED",
      30,
      "TASK_NOT_QUIZ_ELIGIBLE",
    );
  });

  it("allows completing when item is unlocked by quiz snapshot", async () => {
    const onMoveStatus = vi.fn().mockResolvedValue(undefined);
    const noop = vi.fn();

    const unlockedItems: DailyPlanItem[] = [
      {
        ...mockItems[2],
        unlockedForCompletion: true,
      },
    ];

    render(
      <DailyPlanKanbanBoard
        items={unlockedItems}
        editable={false}
        executable={true}
        quizPassed={false}
        onMoveStatus={onMoveStatus}
        onAddTask={noop}
        onEditTask={noop}
        onDeleteTask={noop}
      />,
    );

    // Shows direct "Hoàn thành" button when unlocked
    const completeButton = screen.getByRole("button", { name: /Hoàn thành/i });
    fireEvent.click(completeButton);
    expect(onMoveStatus).toHaveBeenCalledWith("item-3", "COMPLETED");
  });

  it("toggles guidance steps accordion when clicking hints button", () => {
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
      />,
    );

    const hintButton = screen.getByRole("button", { name: /Gợi ý thực hiện \(1 bước\)/i });
    expect(hintButton).not.toBeNull();

    // Step guidance initially hidden
    expect(screen.queryByText("Tập trung vào Polymorphism")).toBeNull();

    // Click to expand
    fireEvent.click(hintButton);
    expect(screen.getByText("Tập trung vào Polymorphism")).not.toBeNull();
  });
});
