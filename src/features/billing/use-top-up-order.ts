import { useCallback, useEffect, useRef, useState } from "react";
import { billingApi, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { CreditPackageResponse, TopUpOrderResponse } from "@/types/api";

export interface UseTopUpOrderResult {
  paymentsEnabled: boolean;
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
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const purchaseInFlight = useRef(false);
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
      const [configuration, response] = await Promise.all([
        billingApi.getConfiguration(),
        billingApi.getPackages(),
      ]);
      setPaymentsEnabled(configuration.paymentsEnabled);
      setPackages(response);
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
      if (purchaseInFlight.current) return null;
      if (!paymentsEnabled) {
        setPurchaseError("Tính năng nạp Credit hiện chưa khả dụng. Bạn vẫn có thể học thủ công.");
        return null;
      }
      purchaseInFlight.current = true;
      setPurchasingPackageId(packageId);
      setPurchaseError(null);

      try {
        // Reuse the same purchase identity after a network/provider failure or page reload.
        const storageKey = `billing-purchase:${packageId}`;
        let idempotencyKey = window.sessionStorage.getItem(storageKey);
        if (!idempotencyKey) {
          idempotencyKey = crypto.randomUUID();
          window.sessionStorage.setItem(storageKey, idempotencyKey);
        }
        const response = await billingApi.createTopUpOrder(packageId, idempotencyKey);
        const order = response;
        setLastCreatedOrder(order);

        // If checkoutUrl is present, redirect user to the payment provider
        if (order.status === "PENDING" && order.checkoutUrl) {
          const url = new URL(order.checkoutUrl);
          if (url.protocol !== "https:") throw new Error("Đường dẫn thanh toán không hợp lệ.");
          if (typeof window !== "undefined") {
            window.location.assign(url.href);
          }
        } else if (order.status !== "PENDING") {
          window.sessionStorage.removeItem(storageKey);
          setPurchaseError(
            "Đơn hàng trước đã kết thúc. Hãy kiểm tra kết quả trước khi tạo lần nạp mới.",
          );
        } else {
          setPurchaseError(
            "Đơn hàng đang chờ xác nhận. Thử lại sẽ sử dụng cùng đơn hàng, không tạo đơn trùng.",
          );
        }

        return order;
      } catch (err) {
        if (isApiErrorCode(err, "CREDIT_PACKAGE_NOT_ACTIVE")) {
          setPurchaseError("Gói nạp này hiện không khả dụng.");
        } else if (isApiErrorCode(err, "TOP_UP_IDEMPOTENCY_CONFLICT")) {
          setPurchaseError("Yêu cầu thanh toán trùng lặp với gói khác. Vui lòng tải lại trang.");
        } else if (isApiErrorCode(err, "PAYMENT_PROVIDER_UNAVAILABLE")) {
          setPurchaseError(
            "Cổng thanh toán hiện đang tạm thời gián đoạn. Chưa thể xác nhận đơn đã được tạo. Thử lại sẽ dùng cùng yêu cầu, không tạo đơn trùng.",
          );
        } else if (isApiErrorCode(err, "TOP_UP_AMOUNT_OUT_OF_BOUNDS")) {
          setPurchaseError("Giá gói nạp nằm ngoài hạn mức thanh toán cho phép.");
        } else {
          setPurchaseError(getErrorMessage(err));
        }
        return null;
      } finally {
        purchaseInFlight.current = false;
        setPurchasingPackageId(null);
      }
    },
    [paymentsEnabled],
  );

  return {
    paymentsEnabled,
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
