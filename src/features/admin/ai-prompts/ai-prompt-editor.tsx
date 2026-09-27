"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Columns,
  FileCode2,
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import type { AiPromptResponse, AiPurpose } from "@/types/api";
import { Button } from "@/components/ui/button";
import { AI_PROMPT_PLACEHOLDERS } from "./config/placeholders";
import { purposeLabels } from "@/features/admin/ai-provider-labels";
import { AiPromptStatusBadge } from "./ai-prompt-status-badge";
import { AiPromptConfirmDialog } from "./ai-prompt-confirm-dialog";
import { aiPromptApi, getErrorMessage } from "@/lib/api-client";
import { useOptionalToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/cn";

export interface AiPromptEditorProps {
  prompt: AiPromptResponse | null; // null means creating a brand new draft
  purpose: AiPurpose;
  activePrompt: AiPromptResponse | null;
  onSaveDraft: (content: string, version?: number) => Promise<void>;
  onPublish?: (promptId: string, version: number) => Promise<void>;
  onReloadLatest?: () => void;
  onLoadDefault?: () => Promise<string | void>;
  isSaving?: boolean;
  conflictError?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  onContentChange?: (content: string) => void;
}

export function AiPromptEditor({
  prompt,
  purpose,
  activePrompt,
  onSaveDraft,
  onPublish,
  onReloadLatest,
  onLoadDefault,
  isSaving = false,
  conflictError = null,
  onDirtyChange,
  onContentChange,
}: AiPromptEditorProps) {
  const [prevPrompt, setPrevPrompt] = useState(prompt);
  const [content, setContent] = useState<string>(prompt?.content ?? "");
  const [showActiveComparison, setShowActiveComparison] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [showConfirmDefault, setShowConfirmDefault] = useState(false);
  const toast = useOptionalToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state during render when prompt prop changes
  if (prompt !== prevPrompt) {
    setPrevPrompt(prompt);
    setContent(prompt?.content ?? "");
    setValidationError(null);
  }

  const isDraft = !prompt || prompt.status === "DRAFT";
  const isReadOnly = !isDraft;
  const initialContent = prompt?.content ?? "";
  const isDirty = content !== initialContent;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onContentChange?.(content);
  }, [content, onContentChange]);

  async function executeLoadDefault() {
    setIsLoadingDefault(true);
    try {
      let defaultContent = "";
      if (onLoadDefault) {
        const res = await onLoadDefault();
        if (typeof res === "string") {
          defaultContent = res;
        }
      } else {
        const res = await aiPromptApi.getDefault(purpose);
        defaultContent = res.content;
      }
      if (defaultContent !== undefined && defaultContent !== null) {
        setContent(defaultContent);
        setValidationError(null);
        toast?.show("✓ Đã tải nội dung mẫu mặc định của hệ thống.");
      }
    } catch (err) {
      toast?.show(getErrorMessage(err), "error");
    } finally {
      setIsLoadingDefault(false);
      setShowConfirmDefault(false);
    }
  }

  function handleLoadDefaultClick() {
    if (isDirty) {
      setShowConfirmDefault(true);
    } else {
      void executeLoadDefault();
    }
  }

  // Insert placeholder at cursor position (or append to end if not focused)
  function handleInsertPlaceholder(syntax: string) {
    if (isReadOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + syntax);
      return;
    }

    const isFocused = typeof document !== "undefined" && document.activeElement === textarea;
    const start = isFocused ? textarea.selectionStart : content.length;
    const end = isFocused ? textarea.selectionEnd : content.length;
    const nextContent = content.substring(0, start) + syntax + content.substring(end);
    setContent(nextContent);

    // Reposition cursor after the inserted text
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntax.length, start + syntax.length);
    });
  }

  async function handleSave() {
    if (!content.trim()) {
      setValidationError("Nội dung System Prompt không được để trống.");
      textareaRef.current?.focus();
      return;
    }
    if (content.length > 20000) {
      setValidationError("Nội dung không được vượt quá 20.000 ký tự.");
      textareaRef.current?.focus();
      return;
    }

    setValidationError(null);
    await onSaveDraft(content, prompt?.version);
  }

  const placeholders = AI_PROMPT_PLACEHOLDERS[purpose] ?? [];
  const charCount = content.length;
  const isOverLimit = charCount > 20000;

  return (
    <section
      aria-label="Khu vực biên tập System Prompt"
      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* Top Header: Purpose & Version Status */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              {purposeLabels[purpose] ?? purpose}
            </span>
            {prompt?.isSystem && (
              <span
                data-testid="editor-system-badge"
                className="flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200"
              >
                Hệ thống
              </span>
            )}
            {prompt && <AiPromptStatusBadge status={prompt.status} />}
          </div>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
            {prompt ? `Phiên bản v${prompt.versionNumber}` : "Bản nháp mới (Draft)"}
          </h2>
        </div>

        {/* Action buttons in header */}
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLoadDefaultClick}
              disabled={isLoadingDefault || isSaving}
              className="h-8 gap-1.5 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold"
              aria-label="Tải mẫu mặc định"
            >
              {isLoadingDefault ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <FileCode2 className="size-3.5 text-purple-600" />
              )}
              Tải mẫu mặc định
            </Button>
          )}

          {/* Comparison toggle with Active prompt if available */}
          {activePrompt && activePrompt.id !== prompt?.id && (
            <button
              type="button"
              onClick={() => setShowActiveComparison((prev) => !prev)}
              aria-pressed={showActiveComparison}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                showActiveComparison
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Columns className="size-3.5" />
              {showActiveComparison ? "Ẩn so sánh Live" : "So sánh với bản Live (v" + activePrompt.versionNumber + ")"}
            </button>
          )}
        </div>
      </header>

      {/* 409 Conflict Alert */}
      {conflictError && (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Xung đột phiên bản (Optimistic Locking Conflict)</p>
              <p className="mt-0.5 text-amber-800">
                Bản nháp này đã được một quản trị viên khác cập nhật. Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.
              </p>
            </div>
          </div>
          {onReloadLatest && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onReloadLatest}
              className="h-8 gap-1.5 bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
            >
              <RefreshCw className="size-3.5" />
              Tải lại bản mới nhất
            </Button>
          )}
        </div>
      )}

      {/* Read-Only Notice for non-draft versions */}
      {isReadOnly && (
        <div
          role="note"
          className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs text-slate-600"
        >
          <Info className="size-4 shrink-0 text-slate-500" />
          <span>
            Phiên bản này có trạng thái <strong>{prompt?.status}</strong> nên ở chế độ chỉ đọc (Read-only). Để chỉnh sửa, hãy tạo một bản nháp mới (Create Draft).
          </span>
        </div>
      )}

      {/* Side-by-side comparison view if toggled */}
      {showActiveComparison && activePrompt && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Active version column */}
          <div className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                <Sparkles className="size-3.5" />
                Bản Live đang chạy (v{activePrompt.versionNumber})
              </span>
              <span className="text-[11px] text-emerald-700 font-mono">
                {activePrompt.content.length} ký tự
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-white/70 p-3 rounded-xl border border-emerald-100">
              {activePrompt.content}
            </div>
          </div>

          {/* Current editing/viewing version note */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="text-xs font-bold text-slate-700">
                {prompt ? `Phiên bản v${prompt.versionNumber}` : "Bản nháp mới"} (Đang xem)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {charCount} ký tự
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-white p-3 rounded-xl border border-slate-200">
              {content || <span className="italic text-slate-400">Trống</span>}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder Assistant Chips */}
      {placeholders.length > 0 && isDraft && (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-2">
            <Sparkles className="size-3.5 text-indigo-600" />
            <span>Chèn biến placeholder (Click để chèn vào vị trí con trỏ):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleInsertPlaceholder(p.syntax)}
                title={`${p.label}: ${p.description}`}
                className="group flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 active:scale-95"
                aria-label={`Chèn biến ${p.syntax}`}
              >
                <Plus className="size-3 text-indigo-500 group-hover:text-indigo-700" />
                <span>{p.syntax}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className="mt-4 flex flex-1 flex-col"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="prompt-content-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Nội dung System Prompt
            </label>
            <span
              className={cn(
                "font-mono text-xs font-semibold",
                isOverLimit ? "text-rose-600" : "text-slate-400",
              )}
            >
              {charCount} / 20.000 ký tự
            </span>
          </div>

          <textarea
            id="prompt-content-input"
            ref={textareaRef}
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isReadOnly}
            aria-invalid={isOverLimit || Boolean(validationError)}
            aria-errormessage={validationError ? "prompt-validation-error" : undefined}
            placeholder="Nhập nội dung System Prompt chỉ dẫn mô hình AI…"
            className={cn(
              "focus-ring w-full rounded-2xl border p-4 font-mono text-xs leading-relaxed transition-all",
              isReadOnly
                ? "border-slate-200 bg-slate-50 text-slate-800 cursor-not-allowed"
                : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 hover:border-slate-400",
              (isOverLimit || validationError) && "border-rose-400 focus:ring-rose-500",
            )}
          />

          {validationError && (
            <p id="prompt-validation-error" className="text-xs font-bold text-rose-600">
              {validationError}
            </p>
          )}
        </div>

        {/* Action Toolbar */}
        {isDraft && (
          <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  Có thay đổi chưa lưu
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Check className="size-3.5 text-emerald-600" />
                  Đã đồng bộ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="submit"
                variant="primary"
                disabled={!isDirty || isSaving || isOverLimit}
                aria-label="Lưu bản nháp"
                className="gap-1.5"
              >
                {isSaving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang lưu…
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu bản nháp
                  </>
                )}
              </Button>

              {prompt && onPublish && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isDirty || isSaving}
                  onClick={() => void onPublish(prompt.id, prompt.version)}
                  className="gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50"
                  aria-label={`Phát hành v${prompt.versionNumber}`}
                >
                  <ArrowUpRight className="size-4 text-sky-600" />
                  Publish
                </Button>
              )}
            </div>
          </footer>
        )}
      </form>

      <AiPromptConfirmDialog
        open={showConfirmDefault}
        onClose={() => setShowConfirmDefault(false)}
        onConfirm={executeLoadDefault}
        title="Tải mẫu mặc định hệ thống?"
        description="Các thay đổi chưa lưu hiện tại sẽ bị mất. Bạn có chắc muốn thay thế nội dung bằng mẫu hệ thống mới nhất?"
        confirmLabel="Tải mẫu mặc định"
        tone="warning"
        loading={isLoadingDefault}
      />
    </section>
  );
}
