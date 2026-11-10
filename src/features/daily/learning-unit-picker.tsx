import { BookOpen, CheckCircle2 } from "lucide-react";
import { Field, Select } from "@/components/ui/field";
import { progressOutcomeLabels, roadmapProgressStatusLabels } from "@/lib/display-labels";
import type { AvailableLearningUnit } from "@/types/api";

export function LearningUnitPicker({
  units,
  value,
  loading,
  allowUnlinked = true,
  onChange,
}: {
  units: AvailableLearningUnit[];
  value: string | null;
  loading: boolean;
  allowUnlinked?: boolean;
  onChange: (unit: AvailableLearningUnit | null) => void;
}) {
  const selectedUnit = units.find((unit) => unit.id === value) ?? null;
  const groups = groupLearningUnits(units);

  return (
    <Field
      label="Liên kết với lộ trình"
      hint="Không bắt buộc. Chỉ các đơn vị học thuộc phiên bản ACTIVE mới có thể được chọn."
    >
      <Select
        value={value ?? ""}
        disabled={loading}
        onChange={(event) => {
          const unit = units.find((candidate) => candidate.id === event.target.value) ?? null;
          onChange(unit);
        }}
      >
        {allowUnlinked && <option value="">Không liên kết với lộ trình</option>}
        {groups.map((group) => (
          <optgroup key={group.key} label={group.label}>
            {group.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.title} · {roadmapProgressStatusLabels[unit.progressStatus]}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {loading && <p className="mt-2 text-xs text-slate-400">Đang tải đơn vị học…</p>}

      {selectedUnit && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs">
          <p className="flex items-center gap-2 font-bold text-indigo-800">
            <BookOpen className="size-4" />
            {selectedUnit.topicTitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <span>{selectedUnit.milestoneTitle}</span>
            <span>{selectedUnit.estimatedMinutes ?? 0} phút dự kiến</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              {roadmapProgressStatusLabels[selectedUnit.progressStatus]}
            </span>
            {selectedUnit.latestOutcome && (
              <span>Kết quả gần nhất: {progressOutcomeLabels[selectedUnit.latestOutcome]}</span>
            )}
          </div>
        </div>
      )}
    </Field>
  );
}

function groupLearningUnits(units: AvailableLearningUnit[]) {
  const groups = new Map<string, { key: string; label: string; units: AvailableLearningUnit[] }>();

  for (const unit of units) {
    const key = `${unit.milestoneId}:${unit.topicId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.units.push(unit);
      continue;
    }

    groups.set(key, {
      key,
      label: `${unit.milestoneTitle} › ${unit.topicTitle}`,
      units: [unit],
    });
  }

  return Array.from(groups.values());
}
