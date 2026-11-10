"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/api-client";
import type { WeakTopic } from "@/types/api";
import { getRoadmapWeakTopics } from "./weak-topics-api";
import { MasteryCheckModal } from "./mastery-check-modal";

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

function isEligibleToday(topic: WeakTopic) {
  if (!topic.eligibleOn || !topic.eligibilityZone) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: topic.eligibilityZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const localDate = `${value("year")}-${value("month")}-${value("day")}`;
  return localDate >= topic.eligibleOn;
}

export function WeakTopicsPanel({ roadmapId, roadmapVersionId }: WeakTopicsPanelProps) {
  const [topics, setTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<WeakTopic | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRoadmapWeakTopics(roadmapId, ["UNRESOLVED", "IN_REVIEW", "MASTERED"]);
      setTopics(result);
      setSelectedTopic((current) =>
        current ? (result.find((topic) => topic.id === current.id) ?? current) : null,
      );
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
      topics.filter(
        (topic) =>
          (!roadmapVersionId || topic.roadmapVersionId === roadmapVersionId) &&
          (showHistory || topic.status !== "MASTERED"),
      ),
    [roadmapVersionId, showHistory, topics],
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-sm font-black text-slate-950">Đơn vị học cần củng cố</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Kết quả được gắn với đúng phiên bản Roadmap đang xem.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowHistory((value) => !value)}>
            {showHistory ? "Ẩn lịch sử" : "Xem lịch sử"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>
      ) : !loading && visibleTopics.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          {showHistory
            ? "Chưa có chủ đề yếu nào trong lộ trình này."
            : "Không có đơn vị học nào cần củng cố."}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleTopics.map((topic) => {
            const status = statusDisplay[topic.status];
            return (
              <div key={topic.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {topic.learningUnitTitle || topic.topicTitle || "Đơn vị học"}
                    </p>
                    {topic.topicTitle && (
                      <p className="mt-1 text-xs font-semibold text-indigo-600">
                        Chủ đề: {topic.topicTitle}
                      </p>
                    )}
                    {topic.milestoneTitle && (
                      <p className="mt-1 text-xs text-slate-500">Cột mốc: {topic.milestoneTitle}</p>
                    )}
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-600">{triggerDisplay[topic.triggerSource]}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                  {topic.lastQuizScore != null && (
                    <span>Micro-Quiz gần nhất: {topic.lastQuizScore.toFixed(1)}%</span>
                  )}
                  {topic.lastMasteryScore != null && (
                    <span>Kiểm tra củng cố: {topic.lastMasteryScore.toFixed(1)}%</span>
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
                {topic.status === "MASTERED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setSelectedTopic(topic)}
                  >
                    Xem kết quả
                  </Button>
                )}
                {topic.status !== "MASTERED" && (
                  <div className="mt-4 space-y-2">
                    <Button
                      size="sm"
                      disabled={!isEligibleToday(topic)}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      Kiểm tra củng cố
                    </Button>
                    {!isEligibleToday(topic) && (
                      <p className="text-xs text-slate-500">
                        Có thể kiểm tra từ ngày {topic.eligibleOn} ({topic.eligibilityZone}).
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <MasteryCheckModal
        key={selectedTopic?.id ?? "closed"}
        topic={selectedTopic}
        onClose={() => setSelectedTopic(null)}
        onUpdated={() => void load()}
      />
    </Card>
  );
}
