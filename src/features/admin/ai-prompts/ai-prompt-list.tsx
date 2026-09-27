"use client";

import { useMemo } from "react";
import {
  Archive,
  ArrowUpRight,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import type { AiPromptResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { AiPromptStatusBadge } from "./ai-prompt-status-badge";
import { cn } from "@/lib/cn";

export interface AiPromptListProps {
  prompts: AiPromptResponse[];
  selectedPromptId: string | null;
  onSelectPrompt: (prompt: AiPromptResponse) => void;
  onCreateDraft: () => void;
  onPublish: (prompt: AiPromptResponse) => void;
  onActivate: (prompt: AiPromptResponse) => void;
  onRollback: (prompt: AiPromptResponse) => void;
  onArchive: (prompt: AiPromptResponse) => void;
  canCreateDraft?: boolean;
  disabled?: boolean;
}

export function AiPromptList({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  onCreateDraft,
  onPublish,
  onActivate,
  onRollback,
  onArchive,
  canCreateDraft = true,
  disabled = false,
}: AiPromptListProps) {
  // Sort prompts by versionNumber descending
  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [prompts]);

  const activePrompt = useMemo(() => {
    return prompts.find((p) => p.isActive || p.status === "ACTIVE");
  }, [prompts]);

  const activeVersionNumber = activePrompt?.versionNumber ?? 0;

  return (
    <aside
      aria-label="Danh sách phiên bản System Prompt"
      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Phiên bản ({prompts.length})
          </h2>
          <p className="text-xs text-slate-500">
            {activePrompt
              ? `AI đang chạy bản v${activePrompt.versionNumber}`
              : "Đang dùng Code Fallback"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onCreateDraft}
          disabled={disabled || !canCreateDraft}
          aria-label="Tạo bản nháp mới"
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <Plus className="size-3.5" />
          Tạo nháp
        </Button>
      </header>

      <ul
        role="listbox"
        aria-label="Các phiên bản prompt"
        className="flex max-h-[calc(100vh-280px)] flex-col gap-2.5 overflow-y-auto pr-1"
      >
        {sortedPrompts.map((prompt) => {
          const isSelected = prompt.id === selectedPromptId;
          const isActive = prompt.isActive || prompt.status === "ACTIVE";
          const isDraft = prompt.status === "DRAFT";
          const isPublished = prompt.status === "PUBLISHED";
          const isArchived = prompt.status === "ARCHIVED";

          // If published, determine if it's a newer version or historical version
          const isRollbackCandidate =
            isPublished && activePrompt && prompt.versionNumber < activeVersionNumber;

          return (
            <li
              key={prompt.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPrompt(prompt);
                }
              }}
              onClick={() => onSelectPrompt(prompt)}
              className={cn(
                "group relative flex cursor-pointer flex-col rounded-2xl border p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                isSelected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                isActive && !isSelected && "border-emerald-300 bg-emerald-50/30",
              )}
            >
              {/* Header row: Version & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-black tracking-tight",
                      isActive ? "text-emerald-700" : "text-slate-900",
                    )}
                  >
                    v{prompt.versionNumber}
                  </span>
                  {prompt.isSystem && (
                    <span
                      data-testid="system-badge"
                      className="flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200"
                    >
                      Hệ thống
                    </span>
                  )}
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                      <Sparkles className="size-3" />
                      LIVE
                    </span>
                  )}
                </div>
                <AiPromptStatusBadge status={prompt.status} />
              </div>

              {/* Metadata */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {new Date(prompt.updatedAt || prompt.createdAt).toLocaleDateString("vi-VN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-mono text-slate-400">
                  {prompt.content.length} ký tự
                </span>
              </div>

              {/* Quick Actions per State Machine Contract */}
              <div
                className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. DRAFT ACTIONS: Edit, Publish, Archive */}
                {isDraft && (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onSelectPrompt(prompt)}
                      className="h-7 px-2.5 text-[11px] font-bold"
                      aria-label={`Chỉnh sửa bản nháp v${prompt.versionNumber}`}
                    >
                      <Pencil className="size-3" />
                      Sửa nháp
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onPublish(prompt)}
                      className="h-7 border-sky-300 text-sky-700 hover:bg-sky-50 px-2.5 text-[11px] font-bold"
                      aria-label={`Phát hành v${prompt.versionNumber}`}
                    >
                      <ArrowUpRight className="size-3 text-sky-600" />
                      Publish
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onArchive(prompt)}
                      className="h-7 text-slate-500 hover:text-rose-600 px-2 text-[11px]"
                      aria-label={`Lưu trữ v${prompt.versionNumber}`}
                    >
                      <Archive className="size-3" />
                    </Button>
                  </>
                )}

                {/* 2. PUBLISHED ACTIONS: Activate (if newer/fresh) or Rollback (if historical) + Archive */}
                {isPublished && (
                  <>
                    {isRollbackCandidate ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onRollback(prompt)}
                        className="h-7 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 px-2.5 text-[11px] font-bold"
                        aria-label={`Rollback về phiên bản v${prompt.versionNumber}`}
                      >
                        <RotateCcw className="size-3 text-amber-700" />
                        Rollback
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onActivate(prompt)}
                        className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 text-[11px] font-bold"
                        aria-label={`Kích hoạt v${prompt.versionNumber} lên Live`}
                      >
                        <Zap className="size-3" />
                        Kích hoạt
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onArchive(prompt)}
                      className="h-7 text-slate-500 hover:text-rose-600 px-2 text-[11px]"
                      aria-label={`Lưu trữ v${prompt.versionNumber}`}
                    >
                      <Archive className="size-3" />
                    </Button>
                  </>
                )}

                {/* 3. ACTIVE: Read-only live version indicator */}
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Sparkles className="size-3" />
                    Đang được áp dụng trên toàn hệ thống
                  </span>
                )}

                {/* 4. ARCHIVED: View only */}
                {isArchived && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onSelectPrompt(prompt)}
                    className="h-7 text-slate-500 hover:text-slate-900 px-2.5 text-[11px]"
                    aria-label={`Xem chi tiết phiên bản lưu trữ v${prompt.versionNumber}`}
                  >
                    <Eye className="size-3" />
                    Xem lịch sử
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
