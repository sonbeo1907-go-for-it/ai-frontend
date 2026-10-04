"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminAiExecutionApi, getErrorMessage } from "@/lib/api-client";
import type { AdminAiExecutionFilterParams, AdminAiExecutionSummary, PageResponse } from "@/types/api";
import { AiExecutionFilterBar } from "./ai-execution-filter-bar";
import { AiExecutionList } from "./ai-execution-list";
import { AiExecutionDetailSheet } from "./ai-execution-detail-sheet";

export function AiExecutionDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const page = Number(searchParams.get("page")) || 0;
  const size = Number(searchParams.get("size")) || 20;
  const sort = searchParams.get("sort") || "createdAt,desc";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const providerId = searchParams.get("providerId") || undefined;
  const model = searchParams.get("model") || undefined;
  const purpose = searchParams.get("purpose") || undefined;
  const operation = searchParams.get("operation") || undefined;
  const status = searchParams.get("status") || undefined;
  const failureCode = searchParams.get("failureCode") || undefined;

  const currentFilters: AdminAiExecutionFilterParams = {
    page,
    size,
    sort,
    from,
    to,
    providerId,
    model,
    purpose,
    operation,
    status,
    failureCode,
  };

  const [data, setData] = useState<PageResponse<AdminAiExecutionSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAiExecutionApi.listExecutions({
        page,
        size,
        sort,
        from,
        to,
        providerId,
        model,
        purpose,
        operation,
        status,
        failureCode,
      });
      setData(response);
    } catch (err: unknown) {
      const httpStatus = (err as { details?: { status?: number } })?.details?.status;
      setError({
        status: httpStatus,
        message: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, [
    page,
    size,
    sort,
    from,
    to,
    providerId,
    model,
    purpose,
    operation,
    status,
    failureCode,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchExecutions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchExecutions]);

  function updateUrl(params: Record<string, string | undefined>) {
    const nextParams = new URLSearchParams();
    // Keep tab parameter if present
    const currentTab = searchParams.get("tab");
    if (currentTab) nextParams.set("tab", currentTab);

    // Apply all incoming params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        nextParams.set(key, value);
      }
    });

    router.replace(`/admin?${nextParams.toString()}`);
  }

  function handleFilterApply(newFilters: AdminAiExecutionFilterParams) {
    updateUrl({
      page: "0",
      size: String(size),
      sort,
      from: newFilters.from,
      to: newFilters.to,
      providerId: newFilters.providerId,
      model: newFilters.model,
      purpose: newFilters.purpose,
      operation: newFilters.operation,
      status: newFilters.status,
      failureCode: newFilters.failureCode,
    });
  }

  function handleReset() {
    // Reset back to exact defaults: page=0, size=20, sort=createdAt,desc
    updateUrl({
      page: "0",
      size: "20",
      sort: "createdAt,desc",
    });
  }

  function handlePageChange(newPage: number) {
    updateUrl({
      page: String(newPage),
      size: String(size),
      sort,
      from,
      to,
      providerId,
      model,
      purpose,
      operation,
      status,
      failureCode,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Activity className="size-4" />
            VẬN HÀNH & GIÁM SÁT
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Lịch sử AI Execution & Chẩn đoán
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tra cứu toàn bộ các tác vụ gọi AI, phân tích độ trễ, lượng token tiêu thụ và sự kiện vòng đời.
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            onClick={() => void fetchExecutions()}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới danh sách
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <AiExecutionFilterBar
        filters={currentFilters}
        onApply={handleFilterApply}
        onReset={handleReset}
        loading={loading}
      />

      {/* Execution List */}
      <AiExecutionList
        pageData={data}
        loading={loading}
        error={error}
        onSelectExecution={(id) => setSelectedExecutionId(id)}
        onPageChange={handlePageChange}
        onRetry={() => void fetchExecutions()}
      />

      {/* Detail Sheet Modal */}
      <AiExecutionDetailSheet
        executionId={selectedExecutionId}
        onClose={() => setSelectedExecutionId(null)}
      />
    </div>
  );
}
