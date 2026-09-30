"use client";

import { useState } from "react";
import { Filter, RotateCcw, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminAiExecutionFilterParams } from "@/types/api";
import { AI_PURPOSES, purposeLabels } from "@/features/admin/ai-provider-labels";

interface AiExecutionFilterBarProps {
  filters: AdminAiExecutionFilterParams;
  onApply: (newFilters: AdminAiExecutionFilterParams) => void;
  onReset: () => void;
  loading?: boolean;
}

export function AiExecutionFilterBar({
  filters,
  onApply,
  onReset,
  loading = false,
}: AiExecutionFilterBarProps) {
  const [localFilters, setLocalFilters] = useState<AdminAiExecutionFilterParams>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleChange(field: keyof AdminAiExecutionFilterParams, value: string) {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value ? value : undefined,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onApply(localFilters);
  }

  function handleResetClick() {
    setLocalFilters({});
    onReset();
  }

  const hasActiveFilters = Boolean(
    localFilters.from ||
      localFilters.to ||
      localFilters.providerId ||
      localFilters.model ||
      localFilters.purpose ||
      localFilters.operation ||
      localFilters.status ||
      localFilters.failureCode,
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Bộ lọc vận hành</h2>
          {hasActiveFilters && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
              Đang áp dụng
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="size-3.5" />
                Thu gọn bộ lọc
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                Bộ lọc nâng cao
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={handleResetClick}
            disabled={loading}
          >
            <RotateCcw className="size-3.5" />
            Đặt lại mặc định
          </Button>

          <Button type="submit" loading={loading} className="text-xs">
            <Search className="size-3.5" />
            Lọc kết quả
          </Button>
        </div>
      </div>

      {/* Main quick filters */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div>
          <label htmlFor="filter-status" className="block text-xs font-semibold text-slate-600 mb-1.5">
            Trạng thái (Status)
          </label>
          <select
            id="filter-status"
            aria-label="Lọc theo trạng thái"
            value={localFilters.status ?? ""}
            onChange={(e) => handleChange("status", e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="QUEUED">QUEUED (Đang chờ)</option>
            <option value="RUNNING">RUNNING (Đang chạy)</option>
            <option value="SUCCEEDED">SUCCEEDED (Thành công)</option>
            <option value="FAILED">FAILED (Thất bại)</option>
            <option value="TIMEOUT">TIMEOUT (Hết giờ)</option>
          </select>
        </div>

        {/* Purpose */}
        <div>
          <label htmlFor="filter-purpose" className="block text-xs font-semibold text-slate-600 mb-1.5">
            Mục đích (Purpose)
          </label>
          <select
            id="filter-purpose"
            aria-label="Lọc theo mục đích"
            value={localFilters.purpose ?? ""}
            onChange={(e) => handleChange("purpose", e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="">Tất cả mục đích</option>
            {AI_PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purposeLabels[purpose] ?? purpose}
              </option>
            ))}
          </select>
        </div>

        {/* Operation */}
        <div>
          <label htmlFor="filter-operation" className="block text-xs font-semibold text-slate-600 mb-1.5">
            Thao tác (Operation)
          </label>
          <select
            id="filter-operation"
            aria-label="Lọc theo thao tác"
            value={localFilters.operation ?? ""}
            onChange={(e) => handleChange("operation", e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="">Tất cả thao tác</option>
            <option value="GENERATE">GENERATE</option>
            <option value="REGENERATE">REGENERATE</option>
          </select>
        </div>

        {/* Failure Code */}
        <div>
          <label htmlFor="filter-failure-code" className="block text-xs font-semibold text-slate-600 mb-1.5">
            Mã lỗi (Failure Code)
          </label>
          <input
            id="filter-failure-code"
            aria-label="Lọc theo mã lỗi"
            type="text"
            placeholder="VD: AI_RATE_LIMIT, TIMEOUT..."
            value={localFilters.failureCode ?? ""}
            onChange={(e) => handleChange("failureCode", e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Advanced filters (Collapsible) */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-down">
          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Từ thời điểm (From)
            </label>
            <input
              type="datetime-local"
              value={localFilters.from ? localFilters.from.slice(0, 16) : ""}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("from", val ? new Date(val).toISOString() : "");
              }}
              className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Đến thời điểm (To)
            </label>
            <input
              type="datetime-local"
              value={localFilters.to ? localFilters.to.slice(0, 16) : ""}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("to", val ? new Date(val).toISOString() : "");
              }}
              className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            />
          </div>

          {/* Provider ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Provider ID (UUID)
            </label>
            <input
              type="text"
              placeholder="UUID của Provider..."
              value={localFilters.providerId ?? ""}
              onChange={(e) => handleChange("providerId", e.target.value)}
              className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 font-mono"
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tên Model
            </label>
            <input
              type="text"
              placeholder="VD: gpt-4o, deepseek-chat..."
              value={localFilters.model ?? ""}
              onChange={(e) => handleChange("model", e.target.value)}
              className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 font-mono"
            />
          </div>
        </div>
      )}
    </form>
  );
}
