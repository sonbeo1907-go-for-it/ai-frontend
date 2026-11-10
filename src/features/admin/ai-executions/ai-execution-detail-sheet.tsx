"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  RefreshCw,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminAiExecutionApi, getErrorMessage } from "@/lib/api-client";
import type { AdminAiExecutionDetail, AiExecutionStatus } from "@/types/api";
import { purposeLabels } from "@/features/admin/ai-provider-labels";
import { AiExecutionTimeline } from "./ai-execution-timeline";

interface AiExecutionDetailSheetProps {
  executionId: string | null;
  onClose: () => void;
}

function formatDetailDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getStatusBadge(status: AiExecutionStatus) {
  switch (status) {
    case "SUCCEEDED":
      return <Badge tone="emerald">Thành công (SUCCEEDED)</Badge>;
    case "FAILED":
      return <Badge tone="rose">Thất bại (FAILED)</Badge>;
    case "RUNNING":
      return <Badge tone="indigo">Đang chạy (RUNNING)</Badge>;
    case "QUEUED":
      return <Badge tone="slate">Đang chờ (QUEUED)</Badge>;
    case "TIMEOUT":
      return <Badge tone="amber">Hết giờ (TIMEOUT)</Badge>;
    default:
      return <Badge tone="slate">{status}</Badge>;
  }
}

export function AiExecutionDetailSheet({ executionId, onClose }: AiExecutionDetailSheetProps) {
  const [detail, setDetail] = useState<AdminAiExecutionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!executionId) {
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      adminAiExecutionApi
        .getExecutionDetail(executionId)
        .then((response) => {
          if (isMounted) setDetail(response);
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const status = (err as { details?: { status?: number } })?.details?.status;
            setError({
              status,
              message: getErrorMessage(err),
            });
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [executionId]);

  function handleCopyId() {
    if (!executionId) return;
    void navigator.clipboard.writeText(executionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isOpen = Boolean(executionId);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Chi tiết chẩn đoán thực thi AI"
      description="Thông tin vận hành và nhật ký các bước xử lý đã được làm sạch theo tiêu chuẩn an toàn."
      width="max-w-4xl"
    >
      {loading && (
        <div className="grid min-h-[350px] place-items-center py-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="size-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu chẩn đoán…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
            {error.status === 403 ? <ShieldAlert className="size-6" /> : <AlertTriangle className="size-6" />}
          </div>
          <h3 className="mt-3 text-base font-bold text-rose-950">
            {error.status === 403
              ? "Từ chối truy cập (403 Forbidden)"
              : error.status === 404
                ? "Không tìm thấy bản ghi (404 Not Found)"
                : "Không thể nạp dữ liệu chẩn đoán"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-rose-700">{error.message}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (executionId) {
                  setLoading(true);
                  setError(null);
                  adminAiExecutionApi
                    .getExecutionDetail(executionId)
                    .then(setDetail)
                    .catch((err) =>
                      setError({
                        status: (err as { details?: { status?: number } })?.details?.status,
                        message: getErrorMessage(err),
                      }),
                    )
                    .finally(() => setLoading(false));
                }
              }}
            >
              <RefreshCw className="size-4" />
              Thử lại
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && detail && (
        <div className="space-y-6">
          {/* Header Summary Cards */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Execution ID
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1 font-mono text-xs text-slate-700 hover:text-indigo-600"
                  title="Sao chép ID"
                >
                  <span>{detail.id}</span>
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {getStatusBadge(detail.status)}
                <Badge tone="indigo">
                  {purposeLabels[detail.purpose] ?? detail.purpose}
                </Badge>
                <Badge tone="slate">{detail.operation}</Badge>
                <Badge tone="sky">Lần thử: {detail.attemptCount}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-right shadow-sm">
                <span className="block text-[11px] font-bold text-slate-400">ĐỘ TRỄ</span>
                <span className="font-bold text-slate-900">
                  {detail.latencyMs != null ? `${detail.latencyMs.toLocaleString()} ms` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Metrics & Provider Info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Provider & Model */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Server className="size-4 text-indigo-600" />
                CẤU HÌNH PROVIDER & MODEL
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="text-sm font-bold text-slate-900">
                  {detail.providerName || (detail.providerId ? `ID: ${detail.providerId}` : "Không xác định")}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  Model: <span className="font-semibold text-slate-700">{detail.model || "—"}</span>
                </p>
              </div>
            </div>

            {/* Token Usage */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Zap className="size-4 text-amber-500" />
                TIÊU THỤ TOKEN
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <span className="block text-[10px] font-semibold text-slate-400">Input</span>
                  <span className="font-bold text-slate-800">
                    {detail.inputTokens != null ? detail.inputTokens.toLocaleString() : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <span className="block text-[10px] font-semibold text-slate-400">Output</span>
                  <span className="font-bold text-slate-800">
                    {detail.outputTokens != null ? detail.outputTokens.toLocaleString() : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2">
                  <span className="block text-[10px] font-semibold text-indigo-500">Tổng</span>
                  <span className="font-bold text-indigo-700">
                    {detail.inputTokens != null && detail.outputTokens != null
                      ? (detail.inputTokens + detail.outputTokens).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Clock className="size-4 text-slate-500" />
                MỐC THỜI GIAN
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tạo:</span>
                  <span className="font-mono">{formatDetailDateTime(detail.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bắt đầu:</span>
                  <span className="font-mono">{formatDetailDateTime(detail.startedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hoàn tất:</span>
                  <span className="font-mono">{formatDetailDateTime(detail.completedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Failure Diagnostic Box (Only if Failure Code or Status is FAILED) */}
          {(detail.status === "FAILED" || detail.failureCode || detail.failureMessage) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-950">
                <AlertTriangle className="size-4 text-rose-600" />
                Thông tin chẩn đoán lỗi
              </div>
              <div className="mt-3 space-y-2">
                {detail.failureCode && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-800">Mã lỗi (Failure Code):</span>
                    <Badge tone="rose">{detail.failureCode}</Badge>
                  </div>
                )}
                {detail.failureMessage && (
                  <div className="mt-2 rounded-xl border border-rose-200/80 bg-white p-3">
                    <p className="font-mono text-xs leading-relaxed text-rose-900 break-words">
                      {detail.failureMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              Nhật ký vòng đời (Execution Timeline)
            </h3>
            <AiExecutionTimeline events={detail.timeline} />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>
              Đóng chi tiết
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
