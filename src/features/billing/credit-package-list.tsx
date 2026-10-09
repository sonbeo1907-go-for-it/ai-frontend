"use client";

import React from "react";
import type { CreditPackageResponse } from "@/types/api";

export interface CreditPackageListProps {
  packages: CreditPackageResponse[];
  loading?: boolean;
  purchasingPackageId?: string | null;
  onSelectPackage: (packageId: string) => void;
  error?: string | null;
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCredits(credits: number): string {
  return new Intl.NumberFormat("vi-VN").format(credits);
}

export function CreditPackageList({
  packages,
  loading = false,
  purchasingPackageId = null,
  onSelectPackage,
  error = null,
}: CreditPackageListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="h-8 w-36 bg-slate-300 dark:bg-slate-600 rounded-md" />
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 font-medium">
          Hiện tại chưa có gói nạp nào sẵn sàng. Vui lòng quay lại sau!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => {
          const isPurchasing = purchasingPackageId === pkg.id;
          const hasBonus = pkg.bonusCredits > 0;

          return (
            <div
              key={pkg.id}
              data-testid={`package-card-${pkg.packageCode}`}
              className={`relative group rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between border ${
                hasBonus
                  ? "bg-gradient-to-b from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm hover:shadow-md"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
              }`}
            >
              {hasBonus && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
                  Thưởng +{formatCredits(pkg.bonusCredits)}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {pkg.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {formatVnd(pkg.priceVnd)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-sm">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Credit cơ bản:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCredits(pkg.baseCredits)}
                    </span>
                  </div>

                  {hasBonus && (
                    <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400 font-medium">
                      <span>Credit thưởng:</span>
                      <span>+{formatCredits(pkg.bonusCredits)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-medium text-slate-900 dark:text-white">
                      Tổng nhận được:
                    </span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {formatCredits(pkg.totalCredits)} AI
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  id={`btn-purchase-${pkg.packageCode}`}
                  disabled={isPurchasing || purchasingPackageId !== null}
                  onClick={() => onSelectPackage(pkg.id)}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    isPurchasing
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-wait"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm hover:shadow"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPurchasing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                      <span>Đang chuyển hướng...</span>
                    </>
                  ) : (
                    "Mua ngay"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
