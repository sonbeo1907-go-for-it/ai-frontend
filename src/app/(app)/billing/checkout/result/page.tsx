"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePaymentConfirmation } from "@/features/billing/use-payment-confirmation";
import { PaymentResultCard } from "@/features/billing/payment-result-card";

function CheckoutResultContent() {
  const searchParams = useSearchParams();

  // VNPAY Return URL passes vnp_TxnRef (which is our orderCode)
  const orderCode = searchParams.get("vnp_TxnRef") || searchParams.get("orderCode");
  const orderId = searchParams.get("orderId");

  const { order, status, isLoading, error, retryPolling } = usePaymentConfirmation({
    orderCode,
    orderId,
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <PaymentResultCard
        order={order}
        status={status}
        isLoading={isLoading}
        error={error}
        onRetry={retryPolling}
      />
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
        </div>
      }
    >
      <CheckoutResultContent />
    </Suspense>
  );
}
