import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiPromptResponse } from "@/types/api";
import { AiPromptEditor } from "./ai-prompt-editor";

const mockDraftPrompt: AiPromptResponse = {
  id: "prompt-draft-1",
  purpose: "ROADMAP_GENERATION",
  versionNumber: 4,
  content: "Initial draft prompt {{language}}",
  status: "DRAFT",
  isActive: false,
  version: 2,
  createdAt: "2026-09-20T00:00:00Z",
  updatedAt: "2026-09-20T00:00:00Z",
};

const mockActivePrompt: AiPromptResponse = {
  id: "prompt-active-1",
  purpose: "ROADMAP_GENERATION",
  versionNumber: 3,
  content: "Active system prompt",
  status: "ACTIVE",
  isActive: true,
  version: 1,
  createdAt: "2026-09-18T00:00:00Z",
  updatedAt: "2026-09-18T00:00:00Z",
};

describe("AiPromptEditor", () => {
  it("renders content, character counter, and disables Save when pristine", () => {
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Initial draft prompt {{language}}");
    expect(screen.getByText(/33 \/ 20\.000 ký tự/)).not.toBeNull();

    const saveBtn = screen.getByRole("button", { name: "Lưu bản nháp" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    expect(screen.getByText("Đã đồng bộ")).not.toBeNull();
  });

  it("enables Save button when content is edited (isDirty)", async () => {
    const onDirtyChange = vi.fn();
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt");
    fireEvent.change(textarea, {
      target: { value: "Updated prompt content" },
    });

    expect(screen.getByText("Có thay đổi chưa lưu")).not.toBeNull();
    const saveBtn = screen.getByRole("button", { name: "Lưu bản nháp" }) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });

  it("inserts placeholder variable when clicking placeholder assistant chip", () => {
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
      />,
    );

    const placeholderBtn = screen.getByRole("button", {
      name: "Chèn biến {{language}}",
    });
    fireEvent.click(placeholderBtn);

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    expect(textarea.value).toBe(
      "Initial draft prompt {{language}}{{language}}",
    );
  });

  it("displays validation error when saving empty content", async () => {
    const onSave = vi.fn();
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={onSave}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt");
    fireEvent.change(textarea, { target: { value: "   " } });

    const saveBtn = screen.getByRole("button", { name: "Lưu bản nháp" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Nội dung System Prompt không được để trống."),
      ).not.toBeNull();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders optimistic locking 409 conflict alert with reload button", () => {
    const onReload = vi.fn();
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
        conflictError="This prompt was updated by another administrator."
        onReloadLatest={onReload}
      />,
    );

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(
      screen.getByText(/Xung đột phiên bản \(Optimistic Locking Conflict\)/),
    ).not.toBeNull();

    const reloadBtn = screen.getByRole("button", {
      name: "Tải lại bản mới nhất",
    });
    fireEvent.click(reloadBtn);
    expect(onReload).toHaveBeenCalled();
  });

  it("renders read-only mode for published / archived versions", () => {
    const publishedPrompt: AiPromptResponse = {
      ...mockDraftPrompt,
      status: "PUBLISHED",
    };

    render(
      <AiPromptEditor
        prompt={publishedPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    expect(screen.getByRole("note").textContent).toContain(
      "Phiên bản này có trạng thái PUBLISHED nên ở chế độ chỉ đọc (Read-only).",
    );
    expect(screen.queryByRole("button", { name: "Tải mẫu mặc định" })).toBeNull();
  });

  it("loads default content directly when pristine (!isDirty)", async () => {
    const onLoadDefault = vi.fn().mockResolvedValue("Default system template content");
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
        onLoadDefault={onLoadDefault}
      />,
    );

    const loadDefaultBtn = screen.getByRole("button", { name: "Tải mẫu mặc định" });
    fireEvent.click(loadDefaultBtn);

    await waitFor(() => {
      expect(onLoadDefault).toHaveBeenCalledTimes(1);
    });

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Default system template content");
    expect(screen.queryByText("Tải mẫu mặc định hệ thống?")).toBeNull();
  });

  it("shows confirmation dialog when clicking load default with unsaved changes (isDirty)", async () => {
    const onLoadDefault = vi.fn().mockResolvedValue("Fresh system template");
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
        onLoadDefault={onLoadDefault}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Dirty unsaved edits" } });

    const loadDefaultBtn = screen.getByRole("button", { name: "Tải mẫu mặc định" });
    fireEvent.click(loadDefaultBtn);

    // Confirmation dialog should be displayed
    expect(screen.getByText("Tải mẫu mặc định hệ thống?")).not.toBeNull();
    expect(
      screen.getByText(
        "Các thay đổi chưa lưu hiện tại sẽ bị mất. Bạn có chắc muốn thay thế nội dung bằng mẫu hệ thống mới nhất?",
      ),
    ).not.toBeNull();
    expect(onLoadDefault).not.toHaveBeenCalled();

    // Confirm loading default
    const confirmBtn = screen.getAllByRole("button", { name: "Tải mẫu mặc định" }).find(
      (btn) => btn.getAttribute("type") === "button" && btn.className.includes("text-white") || btn.className.includes("primary"),
    ) || screen.getAllByRole("button", { name: "Tải mẫu mặc định" })[1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onLoadDefault).toHaveBeenCalledTimes(1);
      expect(textarea.value).toBe("Fresh system template");
    });
  });

  it("cancels loading default when cancel button is clicked in confirm dialog", () => {
    const onLoadDefault = vi.fn();
    render(
      <AiPromptEditor
        prompt={mockDraftPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
        onLoadDefault={onLoadDefault}
      />,
    );

    const textarea = screen.getByLabelText("Nội dung System Prompt") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Important dirty edits" } });

    const loadDefaultBtn = screen.getByRole("button", { name: "Tải mẫu mặc định" });
    fireEvent.click(loadDefaultBtn);

    const cancelBtn = screen.getByRole("button", { name: "Hủy" });
    fireEvent.click(cancelBtn);

    expect(onLoadDefault).not.toHaveBeenCalled();
    expect(textarea.value).toBe("Important dirty edits");
  });

  it("renders 'Hệ thống' badge in header when prompt has isSystem=true", () => {
    const systemPrompt: AiPromptResponse = {
      ...mockDraftPrompt,
      isSystem: true,
    };

    render(
      <AiPromptEditor
        prompt={systemPrompt}
        purpose="ROADMAP_GENERATION"
        activePrompt={mockActivePrompt}
        onSaveDraft={vi.fn()}
      />,
    );

    const badge = screen.getByTestId("editor-system-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("Hệ thống");
  });
});

