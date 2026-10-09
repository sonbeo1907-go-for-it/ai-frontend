"use client";

import React from "react";
import { WalletCard } from "@/features/billing/wallet-card";
import { CreditPackageList } from "@/features/billing/credit-package-list";
import { useTopUpOrder } from "@/features/billing/use-top-up-order";

export default function BillingPage() {
  const {
    packages,
    loadingPackages,
    packageError,
    purchasingPackageId,
    purchaseError,
    purchasePackage,
  } = useTopUpOrder();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <WalletCard />

      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Mua gói AI Credit
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl text-sm sm:text-base">
          Trang bị AI Credit để trải nghiệm tạo lộ trình học tập tự động, sinh kế hoạch mỗi ngày và
          nhận gợi ý thông minh từ AI.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-xs sm:text-sm flex items-start gap-3">
        <svg
          className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <div>
          <span className="font-semibold">Thanh toán an toàn qua VNPAY:</span> Hệ thống không tiếp
          nhận, không xử lý hoặc lưu trữ thông tin thẻ thanh toán của bạn. Mọi giao dịch được mã hóa
          và thực hiện trực tiếp trên cổng thanh toán an toàn.
        </div>
      </div>

      {packageError ? (
        <div
          role="alert"
          className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-3"
        >
          <p className="text-red-700 dark:text-red-300 font-medium">{packageError}</p>
        </div>
      ) : (
        <CreditPackageList
          packages={packages}
          loading={loadingPackages}
          purchasingPackageId={purchasingPackageId}
          onSelectPackage={(pkgId) => void purchasePackage(pkgId)}
          error={purchaseError}
        />
      )}
    </div>
  );
}
