import { AlertCircle, Clock3, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiExecution } from "@/types/api";
import { getTaskGuidanceFailureMessage } from "./task-guidance-errors";

export function TaskGuidanceExecutionStatus({
  execution,
  recovering,
  pollingError,
  onRefresh,
  onDismiss,
}: {
  execution: AiExecution | null;
  recovering: boolean;
  pollingError: string;
  onRefresh: () => void;
  onDismiss: () => void;
}) {
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
          <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            Kiểm tra lại
          </Button>
        )}
      </div>
    );
  }

  const failed = execution.status === "FAILED";
  const queued = execution.status === "QUEUED";

  return (
    <div
      aria-live="polite"
      className={`rounded-2xl border p-4 ${
        failed ? "border-rose-200 bg-rose-50" : "border-indigo-200 bg-indigo-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-700">
          {failed ? (
            <AlertCircle className="size-5 text-rose-700" />
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
                ? "Không thể tạo hướng dẫn AI"
                : queued
                  ? "Yêu cầu đang chờ xử lý"
                  : "AI đang tạo hướng dẫn"}
            </p>
            {failed && (
              <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
                <X className="size-4" />
                Đóng
              </Button>
            )}
          </div>
          <p className={`mt-1 text-sm leading-6 ${failed ? "text-rose-700" : "text-slate-600"}`}>
            {failed
              ? getTaskGuidanceFailureMessage(execution.failureCode)
              : "Bạn có thể đóng cửa sổ; quá trình vẫn tiếp tục trên máy chủ."}
          </p>
          {!failed && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700">
              <Sparkles className="size-3.5" />
              {execution.operation === "REGENERATE"
                ? "Đang tạo phiên bản mới và giữ lịch sử cũ"
                : "Đang tạo bản hướng dẫn DRAFT"}
            </div>
          )}
          {pollingError && !failed && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-700">
              <span>Chưa thể cập nhật trạng thái: {pollingError}</span>
              <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="size-3.5" />
                Kiểm tra ngay
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
