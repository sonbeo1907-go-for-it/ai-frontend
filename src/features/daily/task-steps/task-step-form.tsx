"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { DailyPlanTaskStep } from "@/types/api";

export interface TaskStepFormValues {
  title: string;
  guidance: string | null;
  estimatedMinutes: number | null;
  required: boolean;
  orderIndex?: number;
}

interface TaskStepFormProps {
  parentTitle: string;
  parentPlannedMinutes: number;
  steps: DailyPlanTaskStep[];
  step?: DailyPlanTaskStep;
  loading: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onSubmit: (input: TaskStepFormValues) => Promise<boolean>;
}

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function TaskStepForm({
  parentTitle,
  parentPlannedMinutes,
  steps,
  step,
  loading,
  onDirtyChange,
  onCancel,
  onSubmit,
}: TaskStepFormProps) {
  const [title, setTitle] = useState(step?.title ?? "");
  const [guidance, setGuidance] = useState(step?.guidance ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    step?.estimatedMinutes?.toString() ?? "",
  );
  const [required, setRequired] = useState(step?.required ?? true);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (!step) {
      return Boolean(title.trim() || guidance.trim() || estimatedMinutes || !required);
    }

    return (
      title.trim() !== step.title ||
      guidance.trim() !== (step.guidance ?? "") ||
      estimatedMinutes !== (step.estimatedMinutes?.toString() ?? "") ||
      required !== step.required
    );
  }, [estimatedMinutes, guidance, required, step, title]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function validate() {
    const normalized = normalizeTitle(title);
    if (!normalized) return "Tên bước thực hiện là bắt buộc.";
    if (title.trim().length > 255) return "Tên bước không được vượt quá 255 ký tự.";
    if (guidance.trim().length > 4000) return "Hướng dẫn không được vượt quá 4.000 ký tự.";
    if (normalized === normalizeTitle(parentTitle)) {
      return "Bước thực hiện phải cụ thể hơn tên nhiệm vụ chính.";
    }
    if (
      steps.some(
        (candidate) => candidate.id !== step?.id && normalizeTitle(candidate.title) === normalized,
      )
    ) {
      return "Tên bước thực hiện không được trùng trong cùng một nhiệm vụ.";
    }

    const parsedMinutes = estimatedMinutes ? Number(estimatedMinutes) : null;
    if (
      parsedMinutes !== null &&
      (!Number.isInteger(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440)
    ) {
      return "Thời gian dự kiến phải là số nguyên từ 1 đến 1.440 phút.";
    }

    const otherMinutes = steps.reduce(
      (total, candidate) =>
        candidate.id === step?.id ? total : total + (candidate.estimatedMinutes ?? 0),
      0,
    );
    if (otherMinutes + (parsedMinutes ?? 0) > parentPlannedMinutes) {
      return `Tổng thời gian các bước không được vượt quá ${parentPlannedMinutes} phút.`;
    }

    const otherRequiredCount = steps.filter(
      (candidate) => candidate.id !== step?.id && candidate.required,
    ).length;
    if (!required && otherRequiredCount === 0) {
      return "Danh sách có bước thực hiện phải có ít nhất một bước bắt buộc.";
    }

    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    const input = {
      title: title.trim(),
      guidance: guidance.trim() || null,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      required,
      ...(step ? { orderIndex: step.orderIndex } : {}),
    };

    const saved = await onSubmit(input);
    if (saved) {
      onCancel();
    }
  }

  function cancel() {
    if (
      dirty &&
      !window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy chỉnh sửa bước này?")
    ) {
      return;
    }
    onCancel();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"
    >
      <div>
        <h3 className="font-extrabold text-slate-950">
          {step ? "Chỉnh sửa bước thực hiện" : "Thêm bước thực hiện"}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Mỗi bước nên mô tả một hành động có thể kiểm tra độc lập.
        </p>
      </div>

      <Field label="Tên bước" error={error ?? undefined}>
        <Input
          autoFocus
          value={title}
          maxLength={255}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(null);
          }}
          placeholder="Ví dụ: Viết một ví dụ sử dụng map và flatMap"
          required
        />
      </Field>

      <Field label="Hướng dẫn" hint={`${guidance.length}/4.000 ký tự`}>
        <Textarea
          rows={3}
          value={guidance}
          maxLength={4000}
          onChange={(event) => {
            setGuidance(event.target.value);
          }}
          placeholder="Kết quả cần tạo, lưu ý hoặc tiêu chí hoàn thành…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dự kiến (phút)" hint="Không bắt buộc">
          <Input
            type="number"
            min={1}
            max={1440}
            value={estimatedMinutes}
            onChange={(event) => {
              setEstimatedMinutes(event.target.value);
            }}
            placeholder="Ví dụ: 10"
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-slate-700">Mức độ</legend>
          <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => {
                setRequired(event.target.checked);
              }}
              className="size-4 accent-indigo-600"
            />
            Bước bắt buộc
          </label>
        </fieldset>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={cancel} disabled={loading}>
          Hủy
        </Button>
        <Button type="submit" loading={loading} disabled={!title.trim()}>
          {step ? "Lưu thay đổi" : "Thêm bước"}
        </Button>
      </div>
    </form>
  );
}
