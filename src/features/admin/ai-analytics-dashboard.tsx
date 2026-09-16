"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Layers,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/providers/toast-provider";
import { aiAnalyticsApi, getErrorMessage } from "@/lib/api-client";
import type { AiExecutionAnalytics } from "@/types/api";

type TimeRangePreset = "24h" | "7d" | "30d" | "custom";

export function AiAnalyticsDashboard() {
  const { show } = useToast();
  const [data, setData] = useState<AiExecutionAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<TimeRangePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const calculateDates = useCallback(
    (selectedPreset: TimeRangePreset): { from: string; to: string } => {
      const now = new Date();
      const toIso = now.toISOString();

      if (selectedPreset === "24h") {
        const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return { from: from.toISOString(), to: toIso };
      }
      if (selectedPreset === "30d") {
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: from.toISOString(), to: toIso };
      }
      if (selectedPreset === "custom") {
        return {
          from: customFrom ? new Date(customFrom).toISOString() : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: customTo ? new Date(customTo).toISOString() : toIso,
        };
      }
      // default "7d"
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: toIso };
    },
    [customFrom, customTo]
  );

  const fetchMetrics = useCallback(
    async (selectedPreset: TimeRangePreset = preset) => {
      setIsLoading(true);
      setError(null);
      try {
        const { from, to } = calculateDates(selectedPreset);
        const response = await aiAnalyticsApi.getMetrics(from, to);
        setData(response || []);
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        show(msg, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [calculateDates, preset, show]
  );

  useEffect(() => {
    void fetchMetrics(preset);
  }, [fetchMetrics, preset]);

  // Summary aggregation
  const summary = useMemo(() => {
    let totalExecutions = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalTimeout = 0;
    let totalLatencySum = 0;
    let latencyCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    for (const item of data) {
      totalExecutions += Number(item.totalExecutions || 0);
      totalSucceeded += Number(item.succeededCount || 0);
      totalFailed += Number(item.failedCount || 0);
      totalTimeout += Number(item.timeoutCount || 0);
      if (item.avgLatencyMs != null && item.totalExecutions > 0) {
        totalLatencySum += item.avgLatencyMs * Number(item.totalExecutions);
        latencyCount += Number(item.totalExecutions);
      }
      totalInputTokens += Number(item.totalInputTokens || 0);
      totalOutputTokens += Number(item.totalOutputTokens || 0);
      totalTokens += Number(item.totalTokens || 0);
    }

    const successRate = totalExecutions > 0 ? (totalSucceeded / totalExecutions) * 100 : 0;
    const avgLatencyMs = latencyCount > 0 ? Math.round(totalLatencySum / latencyCount) : null;

    return {
      totalExecutions,
      totalSucceeded,
      totalFailed,
      totalTimeout,
      successRate,
      avgLatencyMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              Chỉ số thực thi & Phân tích AI
            </h2>
            <Badge tone="indigo" className="gap-1">
              <Zap className="size-3" />
              US-ADM-02
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Dữ liệu tổng hợp theo Nhà cung cấp, Mô hình và Thao tác vận hành.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPreset("24h")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                preset === "24h"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              24 giờ
            </button>
            <button
              type="button"
              onClick={() => setPreset("7d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                preset === "7d"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => setPreset("30d")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                preset === "30d"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30 ngày
            </button>
            <button
              type="button"
              onClick={() => setPreset("custom")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                preset === "custom"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tùy chỉnh
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            onClick={() => void fetchMetrics(preset)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Custom Date Inputs if 'custom' selected */}
      {preset === "custom" && (
        <Card className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Từ:</span>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Đến:</span>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => void fetchMetrics("custom")}
            disabled={isLoading}
            className="text-xs py-1 px-3"
          >
            Áp dụng
          </Button>
        </Card>
      )}

      {/* Privacy Notice Banner */}
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900 shadow-xs">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span>
          <strong>Enterprise Privacy Guard:</strong> Hệ thống chỉ tổng hợp metadata (độ trễ, token, số lần gọi). Nội dung Prompt, Response body của người dùng tuyệt đối <strong>không</strong> được ghi nhận hay phân tích.
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Executions */}
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng lượt thực thi
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {summary.totalExecutions.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Succeeded: {summary.totalSucceeded}</span>
            <span>•</span>
            <span className={summary.totalFailed > 0 ? "font-bold text-rose-600" : ""}>
              Failed: {summary.totalFailed}
            </span>
          </div>
        </Card>

        {/* Card 2: Success Rate */}
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tỉ lệ thành công
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {summary.totalExecutions > 0 ? `${summary.successRate.toFixed(1)}%` : "—"}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${summary.successRate}%` }}
            />
          </div>
        </Card>

        {/* Card 3: Timeouts & Latency */}
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Timeout & Độ trễ TB
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-black tracking-tight text-slate-950">
              {summary.avgLatencyMs != null
                ? summary.avgLatencyMs >= 1000
                  ? `${(summary.avgLatencyMs / 1000).toFixed(2)}s`
                  : `${summary.avgLatencyMs} ms`
                : "—"}
            </span>
            {summary.totalTimeout > 0 && (
              <Badge tone="amber" className="gap-1">
                <AlertTriangle className="size-3" />
                {summary.totalTimeout} timeout
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {summary.totalTimeout === 0
              ? "Không có sự cố timeout nào"
              : `${summary.totalTimeout} yêu cầu bị timeout qua gateway`}
          </p>
        </Card>

        {/* Card 4: Tokens Consumed */}
        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng Tokens
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-600">
              <Coins className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {summary.totalTokens.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span title="Input / Prompt tokens">
              In: {summary.totalInputTokens.toLocaleString()}
            </span>
            <span>•</span>
            <span title="Output / Completion tokens">
              Out: {summary.totalOutputTokens.toLocaleString()}
            </span>
          </div>
        </Card>
      </div>

      {/* Analytics Breakdown Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Chi tiết theo Nhà cung cấp & Thao tác
            </h3>
          </div>
        </div>

        {error && (
          <div className="m-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="size-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {!error && data.length === 0 && !isLoading && (
          <div className="py-12">
            <EmptyState
              icon={BarChart3}
              title="Không có dữ liệu thực thi"
              description="Chưa có lượt thực thi AI nào được ghi nhận trong khoảng thời gian đã chọn."
            />
          </div>
        )}

        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Provider & Model</th>
                  <th className="px-6 py-3.5">Thao tác</th>
                  <th className="px-6 py-3.5 text-right">Tổng gọi</th>
                  <th className="px-6 py-3.5">Trạng thái (Thành công / Lỗi / Timeout)</th>
                  <th className="px-6 py-3.5 text-right">Độ trễ TB</th>
                  <th className="px-6 py-3.5 text-right">Input Tokens</th>
                  <th className="px-6 py-3.5 text-right">Output Tokens</th>
                  <th className="px-6 py-3.5 text-right">Tổng Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.map((row, idx) => {
                  const rate =
                    row.totalExecutions > 0
                      ? ((row.succeededCount / row.totalExecutions) * 100).toFixed(0)
                      : "0";
                  return (
                    <tr
                      key={`${row.providerDisplayName}-${row.model}-${row.operation}-${idx}`}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      {/* Provider & Model */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                            <Cpu className="size-3.5" />
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">
                              {row.providerDisplayName || "Unknown"}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              {row.model}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Operation */}
                      <td className="px-6 py-4">
                        <Badge
                          tone={row.operation === "GENERATE" ? "indigo" : "sky"}
                          className="gap-1 font-mono text-[10px]"
                        >
                          <Layers className="size-3" />
                          {row.operation}
                        </Badge>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {row.totalExecutions.toLocaleString()}
                      </td>

                      {/* Status Breakdown */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Badge tone="emerald" className="px-1.5 py-0">
                              {row.succeededCount}
                            </Badge>
                            {row.failedCount > 0 && (
                              <Badge tone="rose" className="px-1.5 py-0">
                                {row.failedCount} failed
                              </Badge>
                            )}
                            {row.timeoutCount > 0 && (
                              <Badge tone="amber" className="gap-1 px-1.5 py-0">
                                <AlertTriangle className="size-2.5" />
                                {row.timeoutCount} timeout
                              </Badge>
                            )}
                            <span className="text-[11px] font-semibold text-slate-400">
                              ({rate}%)
                            </span>
                          </div>
                          {/* Mini distribution bar */}
                          <div className="flex h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="bg-emerald-500"
                              style={{
                                width: `${(row.succeededCount / row.totalExecutions) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-rose-500"
                              style={{
                                width: `${(row.failedCount / row.totalExecutions) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-amber-500"
                              style={{
                                width: `${(row.timeoutCount / row.totalExecutions) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Latency */}
                      <td className="px-6 py-4 text-right font-mono text-slate-700">
                        {row.avgLatencyMs != null
                          ? row.avgLatencyMs >= 1000
                            ? `${(row.avgLatencyMs / 1000).toFixed(2)}s`
                            : `${Math.round(row.avgLatencyMs)} ms`
                          : "—"}
                      </td>

                      {/* Input Tokens */}
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {row.totalInputTokens != null
                          ? row.totalInputTokens.toLocaleString()
                          : "—"}
                      </td>

                      {/* Output Tokens */}
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {row.totalOutputTokens != null
                          ? row.totalOutputTokens.toLocaleString()
                          : "—"}
                      </td>

                      {/* Total Tokens */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {row.totalTokens != null
                          ? row.totalTokens.toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
