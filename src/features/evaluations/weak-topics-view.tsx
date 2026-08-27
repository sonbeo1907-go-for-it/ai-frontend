"use client";

import { AlertCircle, CheckCircle2, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWeakTopics } from "./use-weak-topics";
import { WeakTopicCard } from "./weak-topic-card";

interface WeakTopicsViewProps {
  roadmapId: string;
}

export function WeakTopicsView({ roadmapId }: WeakTopicsViewProps) {
  const { weakTopics, loading, error, fetchWeakTopics } = useWeakTopics(roadmapId);

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-200">
            <Target className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-slate-900">
                Chủ đề cần củng cố
              </h3>
              {!loading && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                  {weakTopics.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Các lỗ hổng kiến thức được hệ thống phát hiện từ bài Quiz và Tự đánh giá
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void fetchWeakTopics()}
          disabled={loading}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Body Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2.5 text-sm font-semibold text-slate-500">
            <RefreshCw className="size-4 animate-spin text-indigo-600" />
            Đang tải danh sách điểm yếu…
          </div>
        ) : error ? (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs font-semibold text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchWeakTopics()}
              className="h-7 text-xs"
            >
              Thử lại
            </Button>
          </div>
        ) : weakTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100">
              <CheckCircle2 className="size-6" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-slate-900">
              Không có chủ đề yếu nào cần củng cố
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Bạn đang nắm vững tất cả kiến thức trong lộ trình này. Hãy tiếp tục duy trì phong độ tốt nhé!
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {weakTopics.map((topic) => (
              <WeakTopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
