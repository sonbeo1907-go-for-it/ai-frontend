"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Filter,
  Lock,
  RefreshCw,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { fetchCreditTransactions } from "./billing-api";
import type { CreditTransaction } from "@/types/api";
import type { PageResponse } from "@/types/api";

const ENTRY_TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại giao dịch" },
  { value: "TOP_UP", label: "Nạp tiền" },
  { value: "WELCOME_BONUS", label: "Khuyến mại" },
  { value: "RESERVE", label: "Giữ chỗ" },
  { value: "USAGE", label: "Sử dụng AI" },
  { value: "RELEASE_RESERVE", label: "Hoàn giữ chỗ" },
  { value: "REFUND", label: "Hoàn Credit" },
  { value: "ADJUSTMENT", label: "ADMIN điều chỉnh" },
];

export function CreditTransactionsView() {
  const [transactions, setTransactions] = useState<PageResponse<CreditTransaction> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);

  const loadData = useCallback(
    async (pageIndex: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchCreditTransactions({
          type: typeFilter || undefined,
          from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
          to: toDate ? `${toDate}T23:59:59Z` : undefined,
          page: pageIndex,
          size: 10,
        });
        setTransactions(res);
        setCurrentPage(pageIndex);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, fromDate, toDate],
  );

  useEffect(() => {
    void loadData(0);
  }, [loadData]);

  const handleResetFilters = () => {
    setTypeFilter("");
    setFromDate("");
    setToDate("");
    setCurrentPage(0);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filters Toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
              Bộ lọc lịch sử giao dịch
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Tra cứu biến động số dư theo loại giao dịch hoặc khoảng thời gian
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Loại giao dịch
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              {ENTRY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            {(typeFilter || fromDate || toDate) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="size-3.5" />
                Đặt lại
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadData(currentPage)}
            loading={loading}
          >
            <RefreshCw className="size-3.5" />
            Làm mới
          </Button>
        </div>
      </section>

      {/* 2. Error state */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 3. Transactions List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Lịch sử giao dịch Credit</h2>
            {transactions && (
              <span className="text-xs text-slate-500">
                Tổng cộng {transactions.totalElements.toLocaleString()} giao dịch
              </span>
            )}
          </div>
        </div>

        {loading && !transactions ? (
          <div className="p-8 text-center text-xs text-slate-500">Đang tải lịch sử giao dịch…</div>
        ) : !transactions || transactions.content.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Clock className="size-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800">Chưa có giao dịch nào</p>
            <p className="mt-1 text-xs text-slate-500">
              Các hoạt động nạp, giữ chỗ và sử dụng AI Credit sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.content.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}

        {/* 4. Pagination Controls */}
        {transactions && transactions.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <span className="text-xs text-slate-500">
              Trang {transactions.page + 1} / {transactions.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={transactions.first || loading}
                onClick={() => void loadData(currentPage - 1)}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={transactions.last || loading}
                onClick={() => void loadData(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const typeConfig = getTypeBadge(tx.entryType);

  return (
    <div className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${typeConfig.iconBg}`}>
          {typeConfig.icon}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={typeConfig.badgeTone}>{typeConfig.label}</Badge>
            <span className="text-xs font-semibold text-slate-900">{tx.description}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{formatDate(tx.recordedAt)}</span>
            {tx.referenceType && (
              <>
                <span>·</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {tx.referenceType}:{tx.referenceId ? tx.referenceId.slice(0, 8) : "—"}
                </span>
              </>
            )}
            <span>·</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
              {tx.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
        {/* Credit Delta */}
        <div className="text-right">
          {tx.availableDelta !== 0 && (
            <span
              className={`text-sm font-black ${
                tx.availableDelta > 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {tx.availableDelta > 0 ? `+${tx.availableDelta}` : tx.availableDelta} Credit khả dụng
            </span>
          )}
          {tx.reservedDelta !== 0 && (
            <span
              className={`block text-xs font-bold ${
                tx.reservedDelta > 0 ? "text-amber-600" : "text-slate-500"
              }`}
            >
              {tx.reservedDelta > 0 ? `+${tx.reservedDelta}` : tx.reservedDelta} Giữ chỗ
            </span>
          )}
          {tx.availableDelta === 0 && tx.reservedDelta === 0 && (
            <span className="text-sm font-bold text-slate-500">0 Credit</span>
          )}
        </div>

        {/* Snapshot Balance after transaction */}
        <span className="text-[11px] text-slate-400">
          Số dư sau GD: <strong className="text-slate-600">{tx.availableBalanceAfter}</strong> khả dụng
          {tx.reservedBalanceAfter > 0 && ` (${tx.reservedBalanceAfter} giữ chỗ)`}
        </span>
      </div>
    </div>
  );
}

function getTypeBadge(entryType: string): {
  label: string;
  badgeTone: "indigo" | "emerald" | "amber" | "rose" | "slate" | "sky";
  icon: React.ReactNode;
  iconBg: string;
} {
  switch (entryType) {
    case "TOP_UP":
      return {
        label: "Nạp tiền",
        badgeTone: "emerald",
        icon: <ArrowDownLeft className="size-4 text-emerald-600" />,
        iconBg: "bg-emerald-50",
      };
    case "WELCOME_BONUS":
    case "PROMOTION":
      return {
        label: "Khuyến mại",
        badgeTone: "sky",
        icon: <Sparkles className="size-4 text-sky-600" />,
        iconBg: "bg-sky-50",
      };
    case "RESERVE":
      return {
        label: "Giữ chỗ",
        badgeTone: "amber",
        icon: <Lock className="size-4 text-amber-600" />,
        iconBg: "bg-amber-50",
      };
    case "USAGE":
      return {
        label: "Sử dụng AI",
        badgeTone: "indigo",
        icon: <ArrowUpRight className="size-4 text-indigo-600" />,
        iconBg: "bg-indigo-50",
      };
    case "RELEASE_RESERVE":
    case "RELEASE":
      return {
        label: "Hoàn giữ chỗ",
        badgeTone: "emerald",
        icon: <CheckCircle2 className="size-4 text-emerald-600" />,
        iconBg: "bg-emerald-50",
      };
    case "REFUND":
      return {
        label: "Hoàn Credit",
        badgeTone: "emerald",
        icon: <RotateCcw className="size-4 text-emerald-600" />,
        iconBg: "bg-emerald-50",
      };
    case "ADJUSTMENT":
      return {
        label: "ADMIN điều chỉnh",
        badgeTone: "slate",
        icon: <RotateCcw className="size-4 text-purple-600" />,
        iconBg: "bg-purple-50",
      };
    default:
      return {
        label: entryType,
        badgeTone: "slate",
        icon: <Coins className="size-4 text-slate-600" />,
        iconBg: "bg-slate-100",
      };
  }
}
