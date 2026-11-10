import { PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { progressOutcomeLabels } from "@/lib/display-labels";
import { formatDate } from "@/lib/format";
import type { DailyPlanItem, DailyPlanTaskProgressHistory, ProgressEntry } from "@/types/api";

export function ProgressHistoryModal({
  item,
  entries,
  loading,
  onClose,
  onCorrect,
}: {
  item: DailyPlanItem;
  entries: ProgressEntry[];
  loading: boolean;
  onClose: () => void;
  onCorrect: (entry: ProgressEntry) => void;
}) {
  const supersededIds = new Set(
    entries.flatMap((entry) => (entry.supersedesEntryId ? [entry.supersedesEntryId] : [])),
  );

  return (
    <Modal open onClose={onClose} title="Lịch sử tiến độ" description={item.title}>
      <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
        {loading && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Đang tải lịch sử…</p>
        )}

        {!loading && entries.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Nhiệm vụ này chưa có kết quả được ghi nhận.
          </p>
        )}

        <ProgressEntryList entries={entries} supersededIds={supersededIds} onCorrect={onCorrect} />
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}

export function DailyPlanProgressHistoryModal({
  histories,
  loading,
  onClose,
}: {
  histories: DailyPlanTaskProgressHistory[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Lịch sử tiến độ kế hoạch"
      description="Bao gồm cả kết quả của những nhiệm vụ đã được gỡ khỏi bản nháp."
      width="max-w-3xl"
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        {loading && <p className="rounded-xl bg-slate-50 p-4 text-sm">Đang tải lịch sử…</p>}
        {!loading && histories.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Kế hoạch này chưa có kết quả học tập nào.
          </p>
        )}
        {histories.map((history) => {
          const supersededIds = new Set(
            history.entries.flatMap((entry) =>
              entry.supersedesEntryId ? [entry.supersedesEntryId] : [],
            ),
          );
          return (
            <section key={history.dailyPlanItemId} className="rounded-2xl border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-900">{history.taskTitle}</h3>
                {history.removedAt && <Badge tone="slate">Nhiệm vụ đã được gỡ</Badge>}
              </div>
              <div className="space-y-3">
                <ProgressEntryList entries={history.entries} supersededIds={supersededIds} />
              </div>
            </section>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}

function ProgressEntryList({
  entries,
  supersededIds,
  onCorrect,
}: {
  entries: ProgressEntry[];
  supersededIds: Set<string>;
  onCorrect?: (entry: ProgressEntry) => void;
}) {
  return entries.map((entry) => {
    const superseded = supersededIds.has(entry.id);
    return (
      <article
        key={entry.id}
        className={`rounded-xl border p-4 ${
          superseded ? "border-slate-200 bg-slate-50 opacity-70" : "border-indigo-100"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={outcomeTone(entry.status)}>{progressOutcomeLabels[entry.status]}</Badge>
              {superseded && <Badge tone="slate">Đã được sửa</Badge>}
              {entry.supersedesEntryId && <Badge tone="indigo">Bản sửa</Badge>}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              {formatDate(entry.recordedAt, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {entry.actualMinutes} phút thực tế
            </p>
          </div>
          {!superseded && onCorrect && (
            <Button variant="secondary" onClick={() => onCorrect(entry)}>
              <PencilLine className="size-4" />
              Sửa kết quả
            </Button>
          )}
        </div>

        <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {entry.actualResult && (
            <div>
              <dt className="text-xs font-bold text-slate-400">Kết quả thực tế</dt>
              <dd>{entry.actualResult}</dd>
            </div>
          )}
          {entry.note && (
            <div>
              <dt className="text-xs font-bold text-slate-400">Ghi chú</dt>
              <dd>{entry.note}</dd>
            </div>
          )}
          {entry.difficulty != null && (
            <div>
              <dt className="text-xs font-bold text-slate-400">Độ khó</dt>
              <dd>{entry.difficulty}/5</dd>
            </div>
          )}
          {entry.understandingRating != null && (
            <div>
              <dt className="text-xs font-bold text-slate-400">Mức hiểu</dt>
              <dd>{entry.understandingRating}/5</dd>
            </div>
          )}
        </dl>
      </article>
    );
  });
}

function outcomeTone(status: ProgressEntry["status"]) {
  if (status === "COMPLETED") return "emerald" as const;
  if (status === "PARTIALLY_COMPLETED") return "amber" as const;
  return "rose" as const;
}
