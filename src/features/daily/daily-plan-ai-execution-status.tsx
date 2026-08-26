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
import type { AiExecution } from "@/types/api";

type DailyPlanAiExecutionStatusProps = {
  execution: AiExecution | null;
  recovering: boolean;
  pollingError: string;
  onRefresh: () => void;
  onDismiss: () => void;
};

export function DailyPlanAiExecutionStatus({
  execution,
  recovering,
  pollingError,
  onRefresh,
  onDismiss,
}: DailyPlanAiExecutionStatusProps) {
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
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="size-4" />
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
  const failed = execution.status === "FAILED";
  const succeeded = execution.status === "SUCCEEDED";

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
                ? "Không thể tạo kế hoạch ngày bằng AI"
                : succeeded
                  ? "AI đã hoàn tất kế hoạch ngày"
                  : queued
                    ? "Yêu cầu đang chờ xử lý"
                    : "AI đang tạo kế hoạch ngày"}
            </p>
            {failed && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="size-4" />
                Đóng
              </Button>
            )}
          </div>
          <p className={`mt-1 text-sm leading-6 ${failed ? "text-rose-700" : "text-slate-600"}`}>
            {failed
              ? execution.failureMessage || "Nhà cung cấp AI không thể hoàn tất yêu cầu."
              : succeeded
                ? "Đang tải phiên bản DRAFT vừa được tạo."
                : running
                  ? "Bạn có thể rời trang. Tiến trình tiếp tục chạy ở máy chủ."
                  : "Yêu cầu đã được tiếp nhận và sẽ bắt đầu khi worker sẵn sàng."}
          </p>
          {pollingError && !failed && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-700">
              <span>Chưa thể cập nhật trạng thái: {pollingError}</span>
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
                ? "Đang tạo phiên bản mới và giữ lịch sử cũ"
                : "Đang tạo bản DRAFT"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
