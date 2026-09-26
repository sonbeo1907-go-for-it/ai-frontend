"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderGit2, RefreshCw } from "lucide-react";
import type { AiPromptResponse, AiPurpose } from "@/types/api";
import { useToast } from "@/components/providers/toast-provider";
import { aiPromptApi, ApiClientError, getErrorMessage } from "@/lib/api-client";
import { AI_PURPOSES, purposeDescriptions, purposeLabels } from "@/features/admin/ai-provider-labels";
import { PageLoading } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { AiPromptList } from "./ai-prompt-list";
import { AiPromptEditor } from "./ai-prompt-editor";
import { AiPromptPreview } from "./ai-prompt-preview";
import { AiPromptEmptyState } from "./ai-prompt-empty-state";
import {
  AiPromptConfirmDialog,
  type ConfirmDialogTone,
} from "./ai-prompt-confirm-dialog";
import { cn } from "@/lib/cn";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: ConfirmDialogTone;
  action: () => Promise<void>;
}

export function AiPromptDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();

  // URL state
  const rawPurpose = searchParams.get("purpose");
  const selectedPurpose: AiPurpose =
    rawPurpose && AI_PURPOSES.includes(rawPurpose as AiPurpose)
      ? (rawPurpose as AiPurpose)
      : "ROADMAP_GENERATION";

  // Data states
  const [prompts, setPrompts] = useState<AiPromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Unsaved changes state
  const [isDirty, setIsDirty] = useState(false);
  const [editorContent, setEditorContent] = useState("");

  // Responsive mobile active subtab
  const [mobileTab, setMobileTab] = useState<"versions" | "editor" | "preview">("editor");

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Xác nhận",
    tone: "primary",
    action: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Load prompts for current purpose
  const loadPrompts = useCallback(
    async (preserveSelection = true) => {
      setLoading(true);
      setConflictError(null);
      try {
        const data = await aiPromptApi.listByPurpose(selectedPurpose);
        setPrompts(data);

        if (!preserveSelection || !selectedPromptId) {
          // Default selection priority: ACTIVE -> Latest DRAFT -> Latest PUBLISHED -> First
          const active = data.find((p) => p.isActive);
          const draft = data.find((p) => p.status === "DRAFT");
          const first = active ?? draft ?? data[0];
          setSelectedPromptId(first?.id ?? null);
          setIsCreatingDraft(false);
        } else {
          // Check if currently selected prompt still exists
          const exists = data.some((p) => p.id === selectedPromptId);
          if (!exists) {
            setSelectedPromptId(data[0]?.id ?? null);
            setIsCreatingDraft(false);
          }
        }
      } catch (err) {
        show(getErrorMessage(err), "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedPurpose, selectedPromptId, show],
  );

  useEffect(() => {
    let active = true;
    void aiPromptApi
      .listByPurpose(selectedPurpose)
      .then((data) => {
        if (!active) return;
        setPrompts(data);
        const activeP = data.find((p) => p.isActive);
        const draft = data.find((p) => p.status === "DRAFT");
        const first = activeP ?? draft ?? data[0];
        setSelectedPromptId(first?.id ?? null);
        setIsCreatingDraft(false);
        setIsDirty(false);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        show(getErrorMessage(err), "error");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPurpose, show]);

  const activePrompt = useMemo(
    () => prompts.find((p) => p.isActive || p.status === "ACTIVE") ?? null,
    [prompts],
  );

  const selectedPrompt = useMemo(() => {
    if (isCreatingDraft) return null;
    return prompts.find((p) => p.id === selectedPromptId) ?? null;
  }, [prompts, selectedPromptId, isCreatingDraft]);

  // Purpose switch with dirty guard
  function handleSelectPurpose(purpose: AiPurpose) {
    if (purpose === selectedPurpose) return;

    if (isDirty) {
      setConfirmDialog({
        open: true,
        title: "Thay đổi chưa lưu",
        description:
          "Bạn đang có nội dung chỉnh sửa chưa lưu. Nếu chuyển sang mục đích khác, các thay đổi này sẽ bị mất.",
        confirmLabel: "Bỏ thay đổi & Chuyển",
        tone: "warning",
        action: async () => {
          setIsDirty(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", "prompts");
          params.set("purpose", purpose);
          router.replace(`/admin?${params.toString()}`);
        },
      });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "prompts");
    params.set("purpose", purpose);
    router.replace(`/admin?${params.toString()}`);
  }

  // Handle selecting a prompt version
  function handleSelectPrompt(prompt: AiPromptResponse) {
    if (isDirty) {
      setConfirmDialog({
        open: true,
        title: "Thay đổi chưa lưu",
        description:
          "Bạn có thay đổi chưa lưu trong bản nháp hiện tại. Bạn có chắc muốn chuyển sang phiên bản khác?",
        confirmLabel: "Bỏ thay đổi",
        tone: "warning",
        action: async () => {
          setIsDirty(false);
          setIsCreatingDraft(false);
          setSelectedPromptId(prompt.id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          setMobileTab("editor");
        },
      });
      return;
    }

    setIsCreatingDraft(false);
    setSelectedPromptId(prompt.id);
    setMobileTab("editor");
  }

  // Handle creating a new draft
  function handleCreateDraft() {
    if (isDirty) {
      setConfirmDialog({
        open: true,
        title: "Thay đổi chưa lưu",
        description:
          "Bạn đang có bản nháp chưa lưu. Bạn có muốn bỏ thay đổi hiện tại để tạo bản nháp mới?",
        confirmLabel: "Bỏ thay đổi",
        tone: "warning",
        action: async () => {
          setIsDirty(false);
          setIsCreatingDraft(true);
          setSelectedPromptId(null);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          setMobileTab("editor");
        },
      });
      return;
    }

    setIsCreatingDraft(true);
    setSelectedPromptId(null);
    setMobileTab("editor");
  }

  // Handle saving draft
  async function handleSaveDraft(content: string, version?: number) {
    setIsSaving(true);
    setConflictError(null);
    try {
      if (isCreatingDraft || !selectedPrompt) {
        // Create draft
        const created = await aiPromptApi.createDraft({
          purpose: selectedPurpose,
          content,
        });
        show(`✓ Đã tạo bản nháp v${created.versionNumber} thành công.`);
        setIsCreatingDraft(false);
        setIsDirty(false);
        await loadPrompts();
        setSelectedPromptId(created.id);
      } else {
        // Update existing draft
        if (version === undefined) {
          throw new Error("Missing version for draft update");
        }
        const updated = await aiPromptApi.updateDraft(selectedPrompt.id, {
          content,
          version,
        });
        show(`✓ Đã lưu bản nháp v${updated.versionNumber}.`);
        setIsDirty(false);
        await loadPrompts();
        setSelectedPromptId(updated.id);
      }
    } catch (err) {
      if (err instanceof ApiClientError && (err.details.status === 409 || err.details.code === "PROMPT_CONCURRENT_UPDATE")) {
        setConflictError(
          "This prompt was updated by another administrator. Your version is no longer the latest version.",
        );
      } else {
        show(getErrorMessage(err), "error");
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Handle Publish action
  async function handlePublishAction(prompt: AiPromptResponse) {
    setConfirmDialog({
      open: true,
      title: `Phát hành Prompt v${prompt.versionNumber}?`,
      description: `Bản nháp v${prompt.versionNumber} sẽ được đóng băng (immutable) và sẵn sàng kích hoạt đưa vào hoạt động chính thức.`,
      confirmLabel: "Phát hành (Publish)",
      tone: "primary",
      action: async () => {
        try {
          setConfirmLoading(true);
          const published = await aiPromptApi.publish(prompt.id, prompt.version);
          show(`✓ Prompt v${published.versionNumber} published successfully.`);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          await loadPrompts();
          setSelectedPromptId(published.id);
        } catch (err) {
          show(getErrorMessage(err), "error");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  // Handle Activate action (for newer published version)
  async function handleActivateAction(prompt: AiPromptResponse) {
    const currentActiveText = activePrompt
      ? ` Thao tác này sẽ thay thế bản đang hoạt động hiện tại (v${activePrompt.versionNumber}).`
      : "";

    setConfirmDialog({
      open: true,
      title: `Kích hoạt Prompt v${prompt.versionNumber}?`,
      description: `Activate Prompt v${prompt.versionNumber}? This will replace the currently active prompt.${currentActiveText}`,
      confirmLabel: "Kích hoạt (Activate)",
      tone: "primary",
      action: async () => {
        try {
          setConfirmLoading(true);
          const activated = await aiPromptApi.activate(prompt.id, prompt.version);
          show(`✓ Prompt v${activated.versionNumber} is now active.`);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          await loadPrompts();
          setSelectedPromptId(activated.id);
        } catch (err) {
          show(getErrorMessage(err), "error");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  // Handle Rollback action (for historical published version)
  async function handleRollbackAction(prompt: AiPromptResponse) {
    const activeVersionNum = activePrompt?.versionNumber ?? 0;
    setConfirmDialog({
      open: true,
      title: `Rollback về phiên bản v${prompt.versionNumber}?`,
      description: `Rollback to v${prompt.versionNumber}? v${prompt.versionNumber} will become the active prompt. The current active version v${activeVersionNum} will remain in history.`,
      confirmLabel: "Xác nhận Rollback",
      tone: "warning",
      action: async () => {
        try {
          setConfirmLoading(true);
          const rolledBack = await aiPromptApi.rollback(prompt.id, prompt.version);
          show(`✓ Prompt v${rolledBack.versionNumber} is now active.`);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          await loadPrompts();
          setSelectedPromptId(rolledBack.id);
        } catch (err) {
          show(getErrorMessage(err), "error");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  // Handle Archive action
  async function handleArchiveAction(prompt: AiPromptResponse) {
    setConfirmDialog({
      open: true,
      title: `Lưu trữ Prompt v${prompt.versionNumber}?`,
      description: `Archive Prompt v${prompt.versionNumber}? This version will no longer be available for activation. Existing execution history will remain unchanged.`,
      confirmLabel: "Lưu trữ (Archive)",
      tone: "danger",
      action: async () => {
        try {
          setConfirmLoading(true);
          await aiPromptApi.archive(prompt.id, prompt.version);
          show(`✓ Prompt v${prompt.versionNumber} archived.`);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          await loadPrompts();
        } catch (err) {
          show(getErrorMessage(err), "error");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  // Check if a draft version currently exists
  const hasDraft = useMemo(() => prompts.some((p) => p.status === "DRAFT"), [prompts]);

  return (
    <div className="space-y-6">
      {/* Purpose Selector Tabs */}
      <section
        aria-label="Lựa chọn mục đích AI Prompt"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <FolderGit2 className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Mục đích sử dụng (AI Purpose)
              </h2>
              <p className="text-xs text-slate-500">
                {purposeDescriptions[selectedPurpose] ?? ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadPrompts()}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
            aria-label="Tải lại danh sách"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Làm mới
          </Button>
        </div>

        {/* Purpose pills */}
        <div
          role="tablist"
          aria-label="Danh sách mục đích AI"
          className="flex flex-wrap gap-2"
        >
          {AI_PURPOSES.map((purpose) => {
            const isSelected = purpose === selectedPurpose;
            return (
              <button
                key={purpose}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectPurpose(purpose)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                  isSelected
                    ? "bg-slate-950 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span>{purposeLabels[purpose] ?? purpose}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <PageLoading label="Đang tải danh sách phiên bản System Prompt…" />
      ) : prompts.length === 0 && !isCreatingDraft ? (
        <AiPromptEmptyState
          onCreateDraft={handleCreateDraft}
          canCreate={!hasDraft}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile subtabs switcher (sm only) */}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("versions")}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                mobileTab === "versions"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Phiên bản ({prompts.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("editor")}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                mobileTab === "editor"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                mobileTab === "preview"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Xem trước
            </button>
          </div>

          {/* Grid Layout: Desktop split-view (Sidebar + Editor + Preview) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Column 1: Version Timeline (List) */}
            <div
              className={cn(
                "lg:col-span-4",
                mobileTab !== "versions" && "hidden lg:block",
              )}
            >
              <AiPromptList
                prompts={prompts}
                selectedPromptId={isCreatingDraft ? null : selectedPromptId}
                onSelectPrompt={handleSelectPrompt}
                onCreateDraft={handleCreateDraft}
                canCreateDraft={!hasDraft}
                onPublish={(p) => void handlePublishAction(p)}
                onActivate={(p) => void handleActivateAction(p)}
                onRollback={(p) => void handleRollbackAction(p)}
                onArchive={(p) => void handleArchiveAction(p)}
                disabled={isSaving}
              />
            </div>

            {/* Column 2 & 3: Editor and Preview Workspace */}
            <div
              className={cn(
                "space-y-6 lg:col-span-8",
                mobileTab === "versions" && "hidden lg:block",
              )}
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Editor Component */}
                <div className={cn(mobileTab === "preview" && "hidden lg:block")}>
                  <AiPromptEditor
                    key={selectedPrompt?.id ?? "draft-new"}
                    prompt={selectedPrompt}
                    purpose={selectedPurpose}
                    activePrompt={activePrompt}
                    onSaveDraft={handleSaveDraft}
                    onPublish={(id) => {
                      const p = prompts.find((item) => item.id === id);
                      if (p) void handlePublishAction(p);
                      return Promise.resolve();
                    }}
                    onReloadLatest={() => void loadPrompts()}
                    isSaving={isSaving}
                    conflictError={conflictError}
                    onDirtyChange={setIsDirty}
                    onContentChange={setEditorContent}
                  />
                </div>

                {/* Preview Component */}
                <div className={cn(mobileTab === "editor" && "hidden lg:block")}>
                  <AiPromptPreview
                    key={selectedPurpose}
                    purpose={selectedPurpose}
                    content={editorContent}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AiPromptConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        loading={confirmLoading}
      />
    </div>
  );
}
