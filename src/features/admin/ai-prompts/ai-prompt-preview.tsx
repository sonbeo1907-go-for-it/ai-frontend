"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  LoaderCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import type { AiPurpose } from "@/types/api";
import { Button } from "@/components/ui/button";
import { aiPromptApi, getErrorMessage } from "@/lib/api-client";
import {
  AI_PROMPT_PLACEHOLDERS,
  getDefaultSyntheticData,
} from "./config/placeholders";

export interface AiPromptPreviewProps {
  purpose: AiPurpose;
  content: string;
}

export function AiPromptPreview({ purpose, content }: AiPromptPreviewProps) {
  const [syntheticData, setSyntheticData] = useState<Record<string, string>>(() =>
    getDefaultSyntheticData(purpose),
  );
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  const placeholders = AI_PROMPT_PLACEHOLDERS[purpose] ?? [];

  async function handleRenderPreview() {
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung prompt trước khi xem trước.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await aiPromptApi.preview({
        purpose,
        content,
        syntheticData,
      });
      setRenderedContent(response.renderedContent);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!renderedContent) return;
    try {
      await navigator.clipboard.writeText(renderedContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  function handleResetSyntheticData() {
    setSyntheticData(getDefaultSyntheticData(purpose));
  }

  return (
    <section
      aria-label="Khu vực xem trước kết xuất prompt"
      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* Synthetic Data Warning Banner */}
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900"
      >
        <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold">Chế độ giả lập (Synthetic Preview)</p>
          <p className="text-amber-800">
            Xem trước nội dung kết xuất sau khi thế các biến placeholder bằng dữ liệu mẫu. Thao tác này an toàn, xử lý nội bộ và không tiêu tốn token AI.
          </p>
        </div>
      </div>

      {/* Synthetic Variables Inputs */}
      {placeholders.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-700">
              Dữ liệu biến mẫu (Synthetic Variables)
            </span>
            <button
              type="button"
              onClick={handleResetSyntheticData}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              aria-label="Khôi phục giá trị mặc định cho các biến"
            >
              <RotateCcw className="size-3" />
              Đặt lại
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {placeholders.map((p) => (
              <div key={p.key} className="space-y-1">
                <label
                  htmlFor={`synthetic-${p.key}`}
                  className="block text-[11px] font-semibold text-slate-600"
                >
                  {p.label} <code className="text-indigo-600 font-mono">{p.syntax}</code>
                </label>
                <input
                  id={`synthetic-${p.key}`}
                  type="text"
                  value={syntheticData[p.key] ?? ""}
                  onChange={(e) =>
                    setSyntheticData((prev) => ({
                      ...prev,
                      [p.key]: e.target.value,
                    }))
                  }
                  placeholder={p.syntheticDefault}
                  className="focus-ring h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">
          Kết xuất hiển thị thực tế khi nạp vào AI Provider
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleRenderPreview()}
          disabled={loading || !content.trim()}
          className="h-8 gap-1.5 px-3 text-xs"
          aria-label="Thử nghiệm kết xuất prompt với biến mẫu"
        >
          {loading ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              Đang render…
            </>
          ) : (
            <>
              <Play className="size-3.5" />
              Render Preview
            </>
          )}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Rendered output display */}
      <div className="mt-3 flex-1">
        <div className="relative rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-[11px] text-slate-400">
            <span className="font-mono">Output Template (Simulated)</span>
            {renderedContent && (
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Sao chép nội dung đã kết xuất"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-indigo-600 selection:text-white">
            {renderedContent ? (
              renderedContent
            ) : (
              <span className="italic text-slate-500">
                Nhấn &quot;Render Preview&quot; để xem prompt sau khi thế các tham số placeholder.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
