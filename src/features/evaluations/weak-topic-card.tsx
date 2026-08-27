import { AlertTriangle, Award, Calendar, HelpCircle, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  weakTopicStatusLabels,
  weakTopicStatusTones,
  weakTopicTriggerLabels,
} from "@/lib/display-labels";
import type { WeakTopic } from "@/types/api";

interface WeakTopicCardProps {
  topic: WeakTopic;
}

export function WeakTopicCard({ topic }: WeakTopicCardProps) {
  const statusTone = weakTopicStatusTones[topic.status] ?? "slate";
  const statusLabel = weakTopicStatusLabels[topic.status] ?? topic.status;
  const triggerLabel = weakTopicTriggerLabels[topic.triggerSource] ?? topic.triggerSource;

  return (
    <div className="group relative flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center">
      {/* Left content */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone} className="px-2.5 py-0.5 text-xs font-bold">
            {statusLabel}
          </Badge>
          {topic.milestoneTitle && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {topic.milestoneTitle}
            </span>
          )}
        </div>

        <div>
          <h4 className="text-sm font-black text-slate-900 transition-colors group-hover:text-indigo-600">
            {topic.topicTitle ||
              (topic.roadmapItemId
                ? `Chủ đề #${topic.roadmapItemId.slice(0, 8)}`
                : `Chủ đề #${topic.id?.slice(0, 8) ?? ""}`)}
          </h4>
        </div>

        {/* Metadata tags */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <AlertTriangle className="size-3.5 text-amber-500" />
            {triggerLabel}
          </span>

          {topic.lastQuizScore !== undefined && topic.lastQuizScore !== null && (
            <span className="inline-flex items-center gap-1 font-medium">
              <HelpCircle className="size-3.5 text-indigo-500" />
              Điểm Quiz:{" "}
              <strong className={topic.lastQuizScore < 80 ? "text-rose-600" : "text-emerald-600"}>
                {Math.round(topic.lastQuizScore)}%
              </strong>
            </span>
          )}

          {topic.lastUnderstandingRating !== undefined && topic.lastUnderstandingRating !== null && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              Đánh giá:{" "}
              <strong className={topic.lastUnderstandingRating <= 2 ? "text-rose-600" : "text-slate-700"}>
                {topic.lastUnderstandingRating}/5 ⭐
              </strong>
            </span>
          )}

          {topic.unresolvedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="size-3" />
              Phát hiện: {formatDate(topic.unresolvedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Right indicator if mastered or in review */}
      {topic.status === "MASTERED" && (
        <div className="flex items-center gap-1.5 self-start rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:self-center">
          <Award className="size-4 text-emerald-600" />
          Đã khắc phục thành công
        </div>
      )}

      {topic.status === "IN_REVIEW" && (
        <div className="flex items-center gap-1.5 self-start rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 sm:self-center">
          <Sparkles className="size-4 text-indigo-600" />
          Đang được lên lịch ôn tập
        </div>
      )}
    </div>
  );
}
