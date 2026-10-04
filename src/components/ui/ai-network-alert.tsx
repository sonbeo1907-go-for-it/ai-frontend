"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AiNetworkAlertProps {
  /** Thông báo lỗi chi tiết nếu có */
  message?: string;
  /** Callback thử kết nối lại hoặc tải lại thủ công */
  onRefresh?: () => void;
  /** Đang trong quá trình thử lại */
  isRefreshing?: boolean;
  className?: string;
}

/**
 * Hiển thị khi gặp lỗi mạng/mất kết nối trong quá trình polling.
 * Tuyệt đối không kết luận AI đã thất bại mà thông báo cho người dùng biết AI vẫn đang chạy ngầm trên máy chủ.
 */
export function AiNetworkAlert({
  message = "Đường truyền mạng bị gián đoạn trong khi theo dõi tiến trình.",
  onRefresh,
  isRefreshing = false,
  className = "",
}: AiNetworkAlertProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-slate-900 ${className}`}
    >
      {/* Vạch màu điểm nhấn hổ phách ở cạnh trái */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-500" />

      <div className="flex items-start gap-4 pl-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 text-amber-600 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400 shadow-xs">
          <WifiOff className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Mất kết nối mạng tạm thời
              </h4>
              <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Đang chờ mạng
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {message} Máy chủ AI vẫn đang tiếp tục xử lý tác vụ của bạn, dữ liệu học tập không bị mất. Hệ thống sẽ tự động kết nối lại khi có mạng.
            </p>
          </div>

          {onRefresh && (
            <div className="pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="rounded-lg border border-amber-300/80 bg-amber-50/50 text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 font-medium transition-all"
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                {isRefreshing ? "Đang thử lại..." : "Tải lại trạng thái"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
