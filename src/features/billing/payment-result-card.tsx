"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TopUpOrderResponse } from "@/types/api";
import type { PaymentConfirmationStatus } from "./use-payment-confirmation";

interface PaymentResultCardProps {
  order: TopUpOrderResponse | null;
  status: PaymentConfirmationStatus;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function PaymentResultCard({
  order,
  status,
  isLoading,
  error,
  onRetry,
}: PaymentResultCardProps) {
  if (status === "INITIALIZING" || status === "VERIFYING") {
    return (
      <div
        data-testid="payment-verifying"
        className="rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-blue-500/5 max-w-xl mx-auto space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
          <svg
            className="h-10 w-10 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Đang chờ xác minh thanh toán
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hệ thống đang kết nối trực tiếp với cổng thanh toán VNPAY để xác nhận giao dịch. Vui lòng
            giữ nguyên màn hình trong giây lát.
          </p>
        </div>

        {order && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left text-xs sm:text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Mã đơn hàng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {order.orderCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Gói nạp:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {order.packageName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(order.priceVnd)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Tự động cập nhật trạng thái...</span>
        </div>
      </div>
    );
  }

  if (status === "SUCCESS") {
    return (
      <div
        data-testid="payment-success"
        className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-emerald-500/10 max-w-xl mx-auto space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
            Giao dịch thành công
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Nạp AI Credit thành công!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Credit đã được cộng vào tài khoản của bạn. Bạn đã có thể bắt đầu sử dụng các tính năng AI
            thông minh ngay bây giờ.
          </p>
        </div>

        {order && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 text-left text-sm space-y-3 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400">AI Credit đã cộng:</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                +{formatNumber(order.totalCredits)} Credit
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Gói nạp:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {order.packageName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(order.priceVnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Mã đơn hàng:</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                {order.orderCode}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/billing"
            className="flex-1 inline-flex justify-center items-center px-5 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-colors text-sm"
          >
            Xem ví AI Credit
          </Link>
          <Link
            href="/daily-plans/today"
            className="flex-1 inline-flex justify-center items-center px-5 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            Học tập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (status === "TIMEOUT") {
    return (
      <div
        data-testid="payment-timeout"
        className="rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-amber-500/10 max-w-xl mx-auto space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/20">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
            Chưa nhận được phản hồi
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Đang chờ ngân hàng xác nhận
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hệ thống chưa nhận được phản hồi tức thì từ cổng thanh toán. Đừng lo lắng! Giao dịch của bạn
            vẫn đang được xử lý. Credit sẽ tự động được cộng vào ví ngay khi nhận được xác nhận từ
            VNPAY.
          </p>
        </div>

        {order && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left text-xs sm:text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Mã đơn hàng:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {order.orderCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Trạng thái hiện tại:</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">Đang chờ xử lý</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            className="flex-1 inline-flex justify-center items-center px-5 py-3 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 shadow-md shadow-amber-600/20 transition-colors text-sm"
          >
            {isLoading ? "Đang kiểm tra..." : "Kiểm tra lại ngay"}
          </button>
          <Link
            href="/billing"
            className="flex-1 inline-flex justify-center items-center px-5 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            Về trang Ví Credit
          </Link>
        </div>
      </div>
    );
  }

  // FAILED, CANCELLED, or EXPIRED
  const isCancelled = status === "CANCELLED";
  const isExpired = status === "EXPIRED";
  const title = isCancelled
    ? "Giao dịch đã bị hủy"
    : isExpired
      ? "Đơn hàng đã hết hạn"
      : "Thanh toán không thành công";

  const description = isCancelled
    ? "Bạn đã chủ động hủy giao dịch trên cổng thanh toán."
    : isExpired
      ? "Thời gian thanh toán cho đơn hàng này đã kết thúc."
      : error || "Cổng thanh toán thông báo giao dịch chưa hoàn tất.";

  return (
    <div
      data-testid="payment-failure"
      className="rounded-3xl border border-red-200/80 dark:border-red-900/40 bg-gradient-to-b from-red-50/60 to-white dark:from-red-950/20 dark:to-slate-900 p-8 sm:p-12 text-center shadow-xl shadow-red-500/10 max-w-xl mx-auto space-y-6"
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/20">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
          {status}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>

      {order && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left text-xs sm:text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Mã đơn hàng:</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {order.orderCode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Gói nạp:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {order.packageName}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/billing"
          className="flex-1 inline-flex justify-center items-center px-5 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors text-sm"
        >
          Chọn gói nạp khác
        </Link>
      </div>
    </div>
  );
}
