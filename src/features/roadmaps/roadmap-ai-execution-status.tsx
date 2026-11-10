import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiErrorAlert } from "@/components/ui/ai-error-alert";
import type { AiExecution } from "@/types/api";

type RoadmapAiExecutionStatusProps = {
  execution: AiExecution | null;
  recovering: boolean;
  pollingError: string;
  onRefresh: () => void;
  onDismiss: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function RoadmapAiExecutionStatus({
  execution,
  recovering,
  pollingError,
  onRefresh,
  onDismiss,
  onRetry,
  isRetrying = false,
}: RoadmapAiExecutionStatusProps) {
  if (!execution && !recovering && !pollingError) return null;

  if (!execution) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <div className="flex items-center gap-3">
          {recovering ? (
            <LoaderCircle className="size-5 animate-spin text-indigo-600" />
          ) : (
            <AlertCircle className="size-5 text-amber-600" />
          )}
          <span>{recovering ? "Đang kiểm tra tiến trình AI…" : pollingError}</span>
        </div>
        {!recovering && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onRetry ?? onRefresh} disabled={isRetrying}>
              <RefreshCw className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
              Thử lại
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="size-4" />
              Đóng
            </Button>
          </div>
        )}
      </div>
    );
  }

  const queued = execution.status === "QUEUED";
  const running = execution.status === "RUNNING";
  const failed = execution.status === "FAILED" || execution.status === "TIMEOUT";
  const succeeded = execution.status === "SUCCEEDED";

  if (failed) {
    return (
      <div className="relative">
        <AiErrorAlert
          execution={execution}
          onRetry={onRetry ?? onRefresh}
          retryLabel="Thử lại"
          isRetrying={isRetrying}
          onManualFallback={onDismiss}
          manualFallbackLabel="Tiếp tục chỉnh sửa thủ công"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
          title="Đóng thông báo"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={`rounded-2xl border p-4 ${
        failed
          ? "border-rose-200 bg-rose-50"
          : succeeded
            ? "border-emerald-200 bg-emerald-50"
            : "border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
            failed
              ? "bg-rose-100 text-rose-700"
              : succeeded
                ? "bg-white text-emerald-700"
                : "bg-white text-indigo-700"
          }`}
        >
          {failed ? (
            <AlertCircle className="size-5" />
          ) : succeeded ? (
            <CheckCircle2 className="size-5" />
          ) : queued ? (
            <Clock3 className="size-5" />
          ) : (
            <LoaderCircle className="size-5 animate-spin" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`font-extrabold ${failed ? "text-rose-900" : "text-slate-950"}`}>
              {failed
                ? "Không thể tạo lộ trình bằng AI"
                : succeeded
                  ? "AI đã hoàn tất lộ trình"
                  : queued
                    ? "Yêu cầu đang chờ xử lý"
                    : "AI đang tạo lộ trình"}
            </p>
            {failed && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="size-4" />
                Đóng
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {succeeded
              ? "Đang tải phiên bản DRAFT vừa được tạo."
              : running
                ? "Bạn có thể rời trang. Tiến trình sẽ tiếp tục chạy ở máy chủ."
                : "Yêu cầu đã được tiếp nhận và sẽ tự động bắt đầu khi có worker sẵn sàng."}
          </p>
          {pollingError && !failed && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-700">
              <span>Chưa thể cập nhật trạng thái: {pollingError}. Hệ thống sẽ tự thử lại.</span>
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-3.5" />
                Kiểm tra ngay
              </Button>
            </div>
          )}
          {!failed && !succeeded && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700">
              <Sparkles className="size-3.5" />
              {execution.operation === "REGENERATE"
                ? "Đang tạo phiên bản mới"
                : "Đang tạo bản DRAFT"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
