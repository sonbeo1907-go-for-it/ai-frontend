import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, billingApi } from "@/lib/api-client";
import type { TopUpOrderResponse } from "@/types/api";

export type PaymentConfirmationStatus =
  "INITIALIZING" | "VERIFYING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED" | "TIMEOUT";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [retryId, setRetryId] = useState(0);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const limit = Math.max(1, Math.min(maxAttempts, 60));

    const finish = (nextStatus: PaymentConfirmationStatus) => {
      setStatus(nextStatus);
      setIsLoading(false);
      active = false;
    };

    const poll = async (attempt: number): Promise<void> => {
      try {
        const data = orderCode
          ? await billingApi.getTopUpOrderByCode(orderCode, controller.signal)
          : orderId
            ? await billingApi.getTopUpOrder(orderId, controller.signal)
            : null;
        // Ignore responses from previous orders, retries or unmounted modals.
        if (!active) return;
        setPollCount(attempt);
        if (!data) {
          setError("Thiếu thông tin đơn hàng để kiểm tra.");
          finish("TIMEOUT");
          return;
        }
        setOrder(data);
        setError(null);
        if (data.status === "PAID") {
          finish("SUCCESS");
          onSuccessRef.current?.(data);
          return;
        }
        if (data.status === "FAILED" || data.status === "CANCELLED" || data.status === "EXPIRED") {
          finish(data.status);
          return;
        }
      } catch (failure) {
        if (!active || controller.signal.aborted) return;
        setPollCount(attempt);
        setError(
          "Chưa thể kiểm tra thanh toán. Nếu đã bị trừ tiền, đừng nạp lại; hãy kiểm tra cùng đơn hàng.",
        );
        if (failure instanceof ApiClientError && [401, 403, 404].includes(failure.details.status)) {
          finish("TIMEOUT");
          return;
        }
      }
      if (attempt >= limit) {
        finish("TIMEOUT");
        return;
      }
      setStatus("VERIFYING");
      timer = setTimeout(() => void poll(attempt + 1), Math.max(500, intervalMs));
    };

    timer = setTimeout(() => {
      setOrder(null);
      setError(null);
      setPollCount(0);
      setIsLoading(true);
      setStatus("INITIALIZING");
      void poll(1);
    }, 0);
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [orderCode, orderId, maxAttempts, intervalMs, retryId]);

  const retryPolling = useCallback(() => setRetryId((previous) => previous + 1), []);
  return { order, status, isLoading, error, pollCount, retryPolling };
}
