import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiPromptResponse } from "@/types/api";
import { AiPromptList } from "./ai-prompt-list";

const mockPrompts: AiPromptResponse[] = [
  {
    id: "p-4",
    purpose: "ROADMAP_GENERATION",
    versionNumber: 4,
    content: "Draft content",
    status: "DRAFT",
    isActive: false,
    version: 0,
    createdAt: "2026-09-20T00:00:00Z",
    updatedAt: "2026-09-20T01:00:00Z",
  },
  {
    id: "p-3",
    purpose: "ROADMAP_GENERATION",
    versionNumber: 3,
    content: "Active content",
    status: "ACTIVE",
    isActive: true,
    version: 1,
    createdAt: "2026-09-18T00:00:00Z",
    updatedAt: "2026-09-18T00:00:00Z",
  },
  {
    id: "p-2",
    purpose: "ROADMAP_GENERATION",
    versionNumber: 2,
    content: "Historical published content",
    status: "PUBLISHED",
    isActive: false,
    version: 1,
    createdAt: "2026-09-15T00:00:00Z",
    updatedAt: "2026-09-15T00:00:00Z",
  },
  {
    id: "p-1",
    purpose: "ROADMAP_GENERATION",
    versionNumber: 1,
    content: "Archived content",
    status: "ARCHIVED",
    isActive: false,
    version: 2,
    createdAt: "2026-09-10T00:00:00Z",
    updatedAt: "2026-09-10T00:00:00Z",
  },
];

describe("AiPromptList", () => {
  it("renders prompts in descending version order and highlights ACTIVE", () => {
    render(
      <AiPromptList
        prompts={mockPrompts}
        selectedPromptId="p-3"
        onSelectPrompt={vi.fn()}
        onCreateDraft={vi.fn()}
        onPublish={vi.fn()}
        onActivate={vi.fn()}
        onRollback={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByText("Phiên bản (4)")).not.toBeNull();
    expect(screen.getByText("AI đang chạy bản v3")).not.toBeNull();
    expect(screen.getByText("LIVE")).not.toBeNull();
  });

  it("provides correct action buttons adhering to state machine contract", () => {
    const onPublish = vi.fn();
    const onRollback = vi.fn();
    const onArchive = vi.fn();

    render(
      <AiPromptList
        prompts={mockPrompts}
        selectedPromptId={null}
        onSelectPrompt={vi.fn()}
        onCreateDraft={vi.fn()}
        onPublish={onPublish}
        onActivate={vi.fn()}
        onRollback={onRollback}
        onArchive={onArchive}
      />,
    );

    // v4 (DRAFT): Sửa nháp, Publish
    expect(screen.getByLabelText("Chỉnh sửa bản nháp v4")).not.toBeNull();
    const publishBtn = screen.getByLabelText("Phát hành v4");
    fireEvent.click(publishBtn);
    expect(onPublish).toHaveBeenCalledWith(mockPrompts[0]);

    // v2 (Historical PUBLISHED): Rollback button
    const rollbackBtn = screen.getByLabelText("Rollback về phiên bản v2");
    expect(rollbackBtn).not.toBeNull();
    fireEvent.click(rollbackBtn);
    expect(onRollback).toHaveBeenCalledWith(mockPrompts[2]);

    // v1 (ARCHIVED): Xem lịch sử only, no Activate or Rollback
    expect(
      screen.getByLabelText("Xem chi tiết phiên bản lưu trữ v1"),
    ).not.toBeNull();
    expect(
      screen.queryByLabelText("Kích hoạt v1 lên Live"),
    ).toBeNull();
    expect(
      screen.queryByLabelText("Rollback về phiên bản v1"),
    ).toBeNull();
  });

  it("handles keyboard navigation (Enter key) to select prompt", () => {
    const onSelectPrompt = vi.fn();

    render(
      <AiPromptList
        prompts={mockPrompts}
        selectedPromptId={null}
        onSelectPrompt={onSelectPrompt}
        onCreateDraft={vi.fn()}
        onPublish={vi.fn()}
        onActivate={vi.fn()}
        onRollback={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    const items = screen.getAllByRole("option");
    fireEvent.keyDown(items[0], { key: "Enter" });
    expect(onSelectPrompt).toHaveBeenCalledWith(mockPrompts[0]);
  });

  it("renders 'Hệ thống' badge for prompts with isSystem=true", () => {
    const promptsWithSystem: AiPromptResponse[] = [
      {
        ...mockPrompts[0],
        isSystem: true,
      },
      {
        ...mockPrompts[1],
        isSystem: false,
      },
    ];

    render(
      <AiPromptList
        prompts={promptsWithSystem}
        selectedPromptId={null}
        onSelectPrompt={vi.fn()}
        onCreateDraft={vi.fn()}
        onPublish={vi.fn()}
        onActivate={vi.fn()}
        onRollback={vi.fn()}
        onArchive={vi.fn()}
      />,
    );

    const badges = screen.getAllByTestId("system-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toContain("Hệ thống");
  });
});

