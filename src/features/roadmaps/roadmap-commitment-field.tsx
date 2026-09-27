"use client";

import { StudyDurationField } from "@/components/ui/study-duration-field";

export function RoadmapCommitmentField({
  value,
  onChange,
  disabled = false,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <StudyDurationField
      value={value}
      onChange={onChange}
      disabled={disabled}
      legend="Quỹ thời gian mỗi ngày"
      description="Đây là mức thời gian thông thường cho riêng lộ trình này, không phải số phút bắt buộc phải học mỗi ngày."
    />
  );
}
