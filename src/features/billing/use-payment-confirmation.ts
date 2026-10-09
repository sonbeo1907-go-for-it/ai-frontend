import { useCallback, useEffect, useRef, useState } from "react";
import { billingApi, getErrorMessage } from "@/lib/api-client";
import type { TopUpOrderResponse } from "@/types/api";

export type PaymentConfirmationStatus =
  | "INITIALIZING"
  | "VERIFYING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "TIMEOUT";

export interface UsePaymentConfirmationResult {
  order: TopUpOrderResponse | null;
  status: PaymentConfirmationStatus;
  isLoading: boolean;
  error: string | null;
  pollCount: number;
  retryPolling: () => void;
}

interface UsePaymentConfirmationOptions {
  orderCode?: string | null;
  orderId?: string | null;
  maxAttempts?: number;
  intervalMs?: number;
  onSuccess?: (order: TopUpOrderResponse) => void;
}

export function usePaymentConfirmation({
  orderCode,
  orderId,
  maxAttempts = 12,
  intervalMs = 2500,
  onSuccess,
}: UsePaymentConfirmationOptions): UsePaymentConfirmationResult {
  const [order, setOrder] = useState<TopUpOrderResponse | null>(null);
  const [status, setStatus] = useState<PaymentConfirmationStatus>("INITIALIZING");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activePollingRef = useRef<boolean>(true);

  const fetchOrder = useCallback(async (): Promise<TopUpOrderResponse | null> => {
    if (orderCode) {
      return await billingApi.getTopUpOrderByCode(orderCode);
    } else if (orderId) {
      return await billingApi.getTopUpOrder(orderId);
    }
    return null;
  }, [orderCode, orderId]);

  const poll = useCallback(
    async (attempt: number) => {
      if (!activePollingRef.current) return;

      try {
        const orderData = await fetchOrder();
        if (!orderData) {
          setError("Không tìm thấy thông tin đơn hàng.");
          setStatus("FAILED");
          setIsLoading(false);
          return;
        }

        setOrder(orderData);
        setPollCount(attempt);

        // Check backend order status
        if (orderData.status === "PAID") {
          setStatus("SUCCESS");
          setIsLoading(false);
          activePollingRef.current = false;
          if (onSuccessRef.current) {
            onSuccessRef.current(orderData);
          }
          return;
        }

        if (orderData.status === "FAILED") {
          setStatus("FAILED");
          setIsLoading(false);
          activePollingRef.current = false;
          return;
        }

        if (orderData.status === "CANCELLED") {
          setStatus("CANCELLED");
          setIsLoading(false);
          activePollingRef.current = false;
          return;
        }

        if (orderData.status === "EXPIRED") {
          setStatus("EXPIRED");
          setIsLoading(false);
          activePollingRef.current = false;
          return;
        }

        // Order is still PENDING: check if maximum polling attempts reached
        if (attempt >= maxAttempts) {
          // Rule: Hết thời gian chờ (timeout) không được tự kết luận giao dịch thất bại, chỉ báo chưa nhận được phản hồi
          setStatus("TIMEOUT");
          setIsLoading(false);
          activePollingRef.current = false;
          return;
        }

        // Schedule next poll
        setStatus("VERIFYING");
        setIsLoading(true);
        timerRef.current = setTimeout(() => {
          void poll(attempt + 1);
        }, intervalMs);
      } catch (err) {
        // Network error during poll: continue trying until max attempts or notify
        if (attempt >= maxAttempts) {
          setStatus("TIMEOUT");
          setIsLoading(false);
          activePollingRef.current = false;
        } else {
          timerRef.current = setTimeout(() => {
            void poll(attempt + 1);
          }, intervalMs);
        }
        setError(getErrorMessage(err));
      }
    },
    [fetchOrder, maxAttempts, intervalMs],
  );

  const retryPolling = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    activePollingRef.current = true;
    setIsLoading(true);
    setError(null);
    setStatus("VERIFYING");
    void poll(1);
  }, [poll]);

  useEffect(() => {
    if (!orderCode && !orderId) {
      setStatus("FAILED");
      setError("Thiếu mã đơn hàng hoặc mã tham chiếu giao dịch.");
      setIsLoading(false);
      return;
    }

    activePollingRef.current = true;
    void poll(1);

    return () => {
      activePollingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [orderCode, orderId, poll]);

  return {
    order,
    status,
    isLoading,
    error,
    pollCount,
    retryPolling,
  };
}
