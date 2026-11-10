"use client";

import { Activity, AlertTriangle, ChevronLeft, ChevronRight, Eye, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { AdminAiExecutionSummary, AiExecutionStatus, PageResponse } from "@/types/api";
import { purposeLabels } from "@/features/admin/ai-provider-labels";

interface AiExecutionListProps {
  pageData: PageResponse<AdminAiExecutionSummary> | null;
  loading: boolean;
  error: { status?: number; message: string } | null;
  onSelectExecution: (id: string) => void;
  onPageChange: (newPage: number) => void;
  onRetry: () => void;
}

function formatListDate(isoString: string): string {
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
      return <Badge tone="emerald">SUCCEEDED</Badge>;
    case "FAILED":
      return <Badge tone="rose">FAILED</Badge>;
    case "RUNNING":
      return <Badge tone="indigo">RUNNING</Badge>;
    case "QUEUED":
      return <Badge tone="slate">QUEUED</Badge>;
    case "TIMEOUT":
      return <Badge tone="amber">TIMEOUT</Badge>;
    default:
      return <Badge tone="slate">{status}</Badge>;
  }
}

export function AiExecutionList({
  pageData,
  loading,
  error,
  onSelectExecution,
  onPageChange,
  onRetry,
}: AiExecutionListProps) {
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
          {error.status === 403 ? <ShieldAlert className="size-6" /> : <AlertTriangle className="size-6" />}
        </div>
        <h3 className="mt-4 text-base font-bold text-rose-950">
          {error.status === 403
            ? "Không có quyền truy cập (403 Forbidden)"
            : "Không thể nạp danh sách thực thi AI"}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-rose-700">{error.message}</p>
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !pageData) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-slate-100 animate-pulse" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const items = pageData?.content ?? [];
  const currentPage = pageData?.page ?? pageData?.number ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;
  const isFirst = pageData?.first ?? currentPage === 0;
  const isLast = pageData?.last ?? currentPage >= totalPages - 1;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Không tìm thấy lịch sử thực thi AI"
        description="Không có bản ghi nào khớp với điều kiện lọc hiện tại hoặc hệ thống chưa thực thi tác vụ AI nào."
        action={
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Tải lại
          </Button>
        }
      />
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Table header / actions toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Danh sách thực thi</h3>
          <p className="text-xs text-slate-500">
            Tổng cộng: <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span> bản ghi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="size-3.5 animate-spin" />
              Đang làm mới…
            </span>
          )}
        </div>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3.5">Thời gian tạo</th>
              <th className="px-6 py-3.5">Mục đích (Purpose)</th>
              <th className="px-6 py-3.5">Thao tác</th>
              <th className="px-6 py-3.5">Trạng thái</th>
              <th className="px-6 py-3.5">Provider / Model</th>
              <th className="px-6 py-3.5">Mã lỗi</th>
              <th className="px-6 py-3.5 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50/80 cursor-pointer"
                onClick={() => onSelectExecution(item.id)}
              >
                {/* Created At */}
                <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600">
                  {formatListDate(item.createdAt)}
                </td>

                {/* Purpose */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge tone="indigo">
                    {purposeLabels[item.purpose] ?? item.purpose}
                  </Badge>
                </td>

                {/* Operation */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge tone="slate">{item.operation}</Badge>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(item.status)}
                </td>

                {/* Provider & Model */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      {item.providerName || (item.providerId ? "Provider đã cấu hình" : "—")}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {item.model || "—"}
                    </span>
                  </div>
                </td>

                {/* Failure Code */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.failureCode ? (
                    <Badge tone="rose">{item.failureCode}</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => onSelectExecution(item.id)}
                  >
                    <Eye className="size-3.5" />
                    Chẩn đoán
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
        <span className="text-xs text-slate-500">
          Trang <span className="font-bold text-slate-900">{currentPage + 1}</span> /{" "}
          <span className="font-bold text-slate-900">{totalPages}</span>
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="text-xs"
            disabled={isFirst || loading}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="size-4" />
            Trang trước
          </Button>

          <Button
            variant="secondary"
            className="text-xs"
            disabled={isLast || loading}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Trang sau
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
