"use client";

import type { AdminAiExecutionTimelineEvent } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, ArrowRightCircle, RefreshCw } from "lucide-react";

interface AiExecutionTimelineProps {
  events?: AdminAiExecutionTimelineEvent[];
}

function formatTimelineDate(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function getEventIcon(eventName: string, synthetic: boolean) {
  const upper = eventName.toUpperCase();
  if (synthetic || upper.includes("RETRY")) {
    return <RefreshCw className="size-4 text-amber-600 animate-spin-reverse" />;
  }
  if (upper.includes("SUCCEEDED") || upper.includes("COMPLETE")) {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (upper.includes("FAIL") || upper.includes("ERROR")) {
    return <AlertCircle className="size-4 text-rose-600" />;
  }
  if (upper.includes("RUNNING")) {
    return <ArrowRightCircle className="size-4 text-indigo-600" />;
  }
  return <Clock className="size-4 text-slate-500" />;
}

export function AiExecutionTimeline({ events }: AiExecutionTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        Chưa có mốc sự kiện nào được ghi nhận trong chu kỳ thực thi này.
      </div>
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-slate-200">
      <div className="space-y-6">
        {events.map((event, index) => {
          const isSynthetic = Boolean(event.synthetic);
          const hasTimestamp = !isSynthetic && Boolean(event.timestamp);
          const formattedDate = hasTimestamp ? formatTimelineDate(event.timestamp) : null;

          return (
            <div key={`${event.eventName}-${index}`} className="relative flex items-start gap-4">
              {/* Timeline marker dot */}
              <div
                className={`absolute -left-6 mt-1 flex size-6 items-center justify-center rounded-full border bg-white shadow-sm ring-4 ring-white ${
                  isSynthetic
                    ? "border-amber-400 bg-amber-50"
                    : event.eventName.toUpperCase().includes("FAIL")
                      ? "border-rose-400 bg-rose-50"
                      : event.eventName.toUpperCase().includes("SUCCEEDED")
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-300"
                }`}
              >
                {getEventIcon(event.eventName, isSynthetic)}
              </div>

              {/* Event content */}
              <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{event.eventName}</span>
                    {isSynthetic && (
                      <Badge tone="amber" title="Sự kiện tái thử hoặc tính toán, không có mốc thời gian tuyệt đối">
                        Synthetic
                      </Badge>
                    )}
                  </div>
                  {hasTimestamp && formattedDate ? (
                    <span className="font-mono text-xs text-slate-500">{formattedDate}</span>
                  ) : (
                    <span className="text-xs italic text-slate-400">
                      {isSynthetic ? "Không ghi nhận thời gian (tái thử)" : "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
