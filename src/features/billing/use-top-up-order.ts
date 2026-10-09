import { useCallback, useEffect, useState } from "react";
import { billingApi, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { CreditPackageResponse, TopUpOrderResponse } from "@/types/api";

export interface UseTopUpOrderResult {
  packages: CreditPackageResponse[];
  loadingPackages: boolean;
  packageError: string | null;
  refreshPackages: () => Promise<void>;
  purchasingPackageId: string | null;
  purchaseError: string | null;
  lastCreatedOrder: TopUpOrderResponse | null;
  purchasePackage: (packageId: string) => Promise<TopUpOrderResponse | null>;
}

export function useTopUpOrder(): UseTopUpOrderResult {
  const [packages, setPackages] = useState<CreditPackageResponse[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [packageError, setPackageError] = useState<string | null>(null);

  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<TopUpOrderResponse | null>(null);

  const refreshPackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackageError(null);
    try {
      const response = await billingApi.getPackages();
      setPackages(response.data);
    } catch (err) {
      setPackageError(getErrorMessage(err));
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void refreshPackages(), 0);
    return () => window.clearTimeout(id);
  }, [refreshPackages]);

  const purchasePackage = useCallback(
    async (packageId: string): Promise<TopUpOrderResponse | null> => {
      setPurchasingPackageId(packageId);
      setPurchaseError(null);

      // Generate unique UUID for this purchase attempt
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `KEY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const response = await billingApi.createTopUpOrder(packageId, idempotencyKey);
        const order = response.data;
        setLastCreatedOrder(order);

        // If checkoutUrl is present, redirect user to the payment provider
        if (order.checkoutUrl) {
          if (typeof window !== "undefined") {
            window.location.href = order.checkoutUrl;
          }
        }

        return order;
      } catch (err) {
        if (isApiErrorCode(err, "CREDIT_PACKAGE_NOT_ACTIVE")) {
          setPurchaseError("Gói nạp này hiện không khả dụng.");
        } else if (isApiErrorCode(err, "TOP_UP_IDEMPOTENCY_CONFLICT")) {
          setPurchaseError("Yêu cầu thanh toán trùng lặp với gói khác. Vui lòng tải lại trang.");
        } else if (isApiErrorCode(err, "PAYMENT_PROVIDER_UNAVAILABLE")) {
          setPurchaseError(
            "Cổng thanh toán hiện đang tạm thời gián đoạn. Đơn hàng của bạn đã được ghi nhận ở trạng thái chờ.",
          );
        } else if (isApiErrorCode(err, "TOP_UP_AMOUNT_OUT_OF_BOUNDS")) {
          setPurchaseError("Giá gói nạp nằm ngoài hạn mức thanh toán cho phép.");
        } else {
          setPurchaseError(getErrorMessage(err));
        }
        return null;
      } finally {
        setPurchasingPackageId(null);
      }
    },
    [],
  );

  return {
    packages,
    loadingPackages,
    packageError,
    refreshPackages,
    purchasingPackageId,
    purchaseError,
    lastCreatedOrder,
    purchasePackage,
  };
}
