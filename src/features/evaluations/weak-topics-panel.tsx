"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/api-client";
import type { WeakTopic } from "@/types/api";
import { getRoadmapWeakTopics } from "./weak-topics-api";

interface WeakTopicsPanelProps {
  roadmapId: string;
  roadmapVersionId?: string;
}

const statusDisplay = {
  UNRESOLVED: { label: "Cần củng cố", tone: "rose" as const },
  IN_REVIEW: { label: "Đang ôn tập", tone: "amber" as const },
  MASTERED: { label: "Đã nắm vững", tone: "emerald" as const },
};

const triggerDisplay = {
  QUIZ_FAILED: "Kết quả Quiz dưới 80%",
  LOW_RATING: "Mức tự đánh giá thấp",
  BOTH: "Quiz và mức tự đánh giá đều thấp",
};

export function WeakTopicsPanel({ roadmapId, roadmapVersionId }: WeakTopicsPanelProps) {
  const [topics, setTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRoadmapWeakTopics(roadmapId);
      setTopics(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleTopics = useMemo(
    () =>
      roadmapVersionId
        ? topics.filter((topic) => topic.roadmapVersionId === roadmapVersionId)
        : topics,
    [roadmapVersionId, topics],
  );

  if (!loading && !error && visibleTopics.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-sm font-black text-slate-950">Chủ đề cần củng cố</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Kết quả được gắn với đúng phiên bản Roadmap đang xem.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleTopics.map((topic) => {
            const status = statusDisplay[topic.status];
            return (
              <div key={topic.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{topic.topicTitle}</p>
                    {topic.milestoneTitle && (
                      <p className="mt-1 text-xs text-slate-500">{topic.milestoneTitle}</p>
                    )}
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-600">{triggerDisplay[topic.triggerSource]}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                  {topic.lastQuizScore != null && (
                    <span>Quiz gần nhất: {topic.lastQuizScore.toFixed(1)}%</span>
                  )}
                  {topic.lastUnderstandingRating != null && (
                    <span>Mức hiểu: {topic.lastUnderstandingRating}/5</span>
                  )}
                </div>
                {topic.status === "MASTERED" && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    Đã vượt qua kiểm tra củng cố
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
