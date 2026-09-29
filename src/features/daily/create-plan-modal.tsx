"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { todayIso } from "@/lib/format";
import { formatStudyDuration, isValidStudyDuration } from "@/lib/study-duration";
import type { DailyPlan, PageResponse, RoadmapSummary } from "@/types/api";

export interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
  roadmaps?: RoadmapSummary[];
  timeZone?: string;
  defaultMinutes?: number;
}

export function CreatePlanModal({
  open,
  onClose,
  onCreated,
  roadmaps: propRoadmaps,
  timeZone,
  defaultMinutes = 60,
}: CreatePlanModalProps) {
  const { show } = useToast();
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>(propRoadmaps ?? []);
  const [date, setDate] = useState(todayIso(timeZone));
  const [useInheritedBudget, setUseInheritedBudget] = useState(true);
  const [minutes, setMinutes] = useState<number | undefined>(defaultMinutes);
  const [roadmapId, setRoadmapId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propRoadmaps) {
      setRoadmaps(propRoadmaps);
    } else if (open) {
      void apiRequest<PageResponse<RoadmapSummary>>(
        "/api/v1/roadmaps?status=ACTIVE&page=0&size=100&sort=updatedAt,desc",
      )
        .then((res) => setRoadmaps(res.content))
        .catch(() => {});
    }
  }, [open, propRoadmaps]);

  const initialDate = todayIso(timeZone);
  const selectedRoadmap = roadmaps.find((roadmap) => roadmap.id === roadmapId);
  const inheritedMinutes = selectedRoadmap?.dailyCommitmentMinutes ?? defaultMinutes;
  const inheritedSource = selectedRoadmap?.dailyCommitmentMinutes
    ? `Lộ trình “${selectedRoadmap.title}”`
    : "Mặc định tài khoản";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const plan = await apiRequest<DailyPlan>("/api/v1/daily-plans", {
        method: "POST",
        body: JSON.stringify({
          planDate: date,
          availableMinutes: useInheritedBudget ? null : minutes,
          roadmapId: roadmapId || null,
        }),
      });
      show("Kế hoạch DRAFT đã được tạo. Hãy thêm nhiệm vụ hoặc kích hoạt để bắt đầu.");
      if (onCreated) await onCreated();
      onClose();
      router.push(`/daily-plans/${plan.id}`);
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo kế hoạch ngày"
      description="Kế hoạch mới bắt đầu ở DRAFT và sẵn sàng để bạn thêm nhiệm vụ hoặc chạy AI đề xuất."
      closeDisabled={loading}
      confirmClose={
        date !== initialDate ||
        !useInheritedBudget ||
        Boolean(roadmapId)
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Ngày học">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field
          label="Lộ trình liên quan"
          hint="Không bắt buộc. Việc chọn lộ trình không tự động tạo task."
        >
          <Select value={roadmapId} onChange={(event) => setRoadmapId(event.target.value)}>
            <option value="">Không liên kết</option>
            {roadmaps.map((roadmap) => (
              <option value={roadmap.id} key={roadmap.id}>
                {roadmap.title || "Lộ trình từ khảo sát"}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-slate-700">Quỹ thời gian</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="budget-mode"
              className="mt-0.5"
              checked={useInheritedBudget}
              onChange={() => setUseInheritedBudget(true)}
            />
            <span>
              <strong className="block text-sm text-slate-800">Dùng mức được đề xuất</strong>
              <span className="mt-1 block text-xs text-slate-500">
                {inheritedSource}: {formatStudyDuration(inheritedMinutes)}. Máy chủ sẽ xác nhận giá trị khi tạo.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="budget-mode"
              className="mt-0.5"
              checked={!useInheritedBudget}
              onChange={() => setUseInheritedBudget(false)}
            />
            <span>
              <strong className="block text-sm text-slate-800">Tùy chỉnh cho ngày này</strong>
              <span className="mt-1 block text-xs text-slate-500">
                Chỉ thay đổi snapshot của phiên bản kế hoạch ngày mới.
              </span>
            </span>
          </label>
        </fieldset>
        {!useInheritedBudget ? (
          <StudyDurationField
            value={minutes}
            onChange={setMinutes}
            legend="Thời gian dành riêng cho ngày này"
          />
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="success"
            loading={loading}
            disabled={!useInheritedBudget && !isValidStudyDuration(minutes)}
          >
            Tạo ngày mới
          </Button>
        </div>
      </form>
    </Modal>
  );
}
