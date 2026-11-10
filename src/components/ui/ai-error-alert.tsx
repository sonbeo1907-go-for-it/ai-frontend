"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCw,
  PenTool,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAiErrorTaxonomy } from "@/lib/ai-error-taxonomy";
import type { AiExecution } from "@/types/api";

export interface AiErrorAlertProps {
  /** Thông tin AiExecution bị lỗi (FAILED / TIMEOUT) */
  execution?: AiExecution | null;
  /** Hoặc mã lỗi trực tiếp nếu chưa có object execution */
  failureCode?: string | null;
  /** Request ID từ header/response nếu có */
  requestId?: string | null;
  /** Thời điểm xảy ra lỗi (ISO string hoặc timestamp formatted) */
  timestamp?: string | null;
  /** Callback thử lại */
  onRetry?: () => void;
  /** Nhãn nút thử lại (mặc định: "Thử lại") */
  retryLabel?: string;
  /** Trạng thái đang thử lại */
  isRetrying?: boolean;
  /** Callback chuyển sang luồng thủ công */
  onManualFallback?: () => void;
  /** Nhãn nút thủ công (mặc định: "Làm thủ công") */
  manualFallbackLabel?: string;
  /** Tuỳ biến class container */
  className?: string;
}

export function AiErrorAlert({
  execution,
  failureCode,
  requestId,
  timestamp,
  onRetry,
  retryLabel = "Thử lại",
  isRetrying = false,
  onManualFallback,
  manualFallbackLabel = "Làm thủ công",
  className = "",
}: AiErrorAlertProps) {
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const effectiveCode = failureCode || execution?.failureCode;
  const taxonomy = React.useMemo(
    () => getAiErrorTaxonomy(effectiveCode),
    [effectiveCode]
  );

  const effectiveExecutionId = execution?.id || "N/A";
  const effectiveRequestId = requestId || "N/A";
  const effectiveTimestamp =
    timestamp ||
    execution?.completedAt ||
    execution?.updatedAt ||
    new Date().toISOString();

  const copyTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyDiagnostics = async () => {
    const diagnosticPayload = [
      `Execution ID: ${effectiveExecutionId}`,
      `Request ID: ${effectiveRequestId}`,
      `Thời điểm: ${effectiveTimestamp}`,
      `Nhóm lỗi: ${taxonomy.category}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(diagnosticPayload);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback nếu clipboard API bị block
      setCopied(false);
    }
  };

  const renderRetryButton = taxonomy.canRetry && onRetry;
  const renderManualButton = taxonomy.canManual && onManualFallback;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative overflow-hidden rounded-2xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-slate-900 ${className}`}
    >
      {/* Vạch màu điểm nhấn thanh lịch ở cạnh trái */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 to-rose-600" />

      <div className="flex items-start gap-4 pl-1">
        {/* Icon cảnh báo với badge tròn cao cấp */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 shadow-xs">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Header & Tiêu đề - Tương phản cực cao, dễ đọc tuyệt đối */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {taxonomy.title}
              </h4>
              <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                Sự cố AI
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {taxonomy.description}
            </p>
          </div>

          {/* AC2: Khối khẳng định an toàn dữ liệu - Tông màu xanh ngọc an tâm, tương phản rõ nét */}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-200 shadow-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span className="font-medium leading-relaxed">{taxonomy.dataSafetyMessage}</span>
          </div>

          {/* AC3: Các hành động phục hồi (Recovery Actions) */}
          {(renderRetryButton || renderManualButton) && (
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {renderRetryButton && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs hover:shadow transition-all active:scale-[0.98]"
                >
                  <RotateCw
                    className={`mr-1.5 h-3.5 w-3.5 ${
                      isRetrying ? "animate-spin" : ""
                    }`}
                  />
                  {isRetrying ? "Đang xử lý..." : retryLabel}
                </Button>
              )}

              {renderManualButton && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onManualFallback}
                  className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 font-medium transition-all"
                >
                  <PenTool className="mr-1.5 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  {manualFallbackLabel}
                </Button>
              )}
            </div>
          )}

          {/* AC5: Chẩn đoán & Hỗ trợ (Diagnostics) */}
          <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-hidden transition-colors"
              aria-expanded={showDiagnostics}
            >
              <span>Chi tiết chẩn đoán hỗ trợ</span>
              {showDiagnostics ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showDiagnostics && (
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Mã chẩn đoán (không chứa dữ liệu cá nhân):
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDiagnostics}
                    className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium"
                    title="Sao chép mã chẩn đoán để báo lỗi"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </Button>
                </div>

                <dl className="mt-2.5 grid grid-cols-[105px_1fr] gap-x-2 gap-y-1.5 font-mono text-[11px]">
                  <dt className="text-slate-500 dark:text-slate-400 font-sans">Execution ID:</dt>
                  <dd className="break-all font-medium text-slate-900 dark:text-slate-200">
                    {effectiveExecutionId}
                  </dd>

                  <dt className="text-slate-500 dark:text-slate-400 font-sans">Request ID:</dt>
                  <dd className="break-all font-medium text-slate-900 dark:text-slate-200">
                    {effectiveRequestId}
                  </dd>

                  <dt className="text-slate-500 dark:text-slate-400 font-sans">Thời điểm:</dt>
                  <dd className="break-all font-medium text-slate-900 dark:text-slate-200">
                    {effectiveTimestamp}
                  </dd>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
