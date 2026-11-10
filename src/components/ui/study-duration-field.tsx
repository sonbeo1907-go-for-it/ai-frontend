"use client";

import { useId, useState } from "react";
import { Input, Select } from "@/components/ui/field";
import {
  combineStudyDuration,
  formatStudyDuration,
  isValidStudyDuration,
  quickStudyDurationLabel,
  STUDY_DURATION_QUICK_CHOICES,
  splitStudyDuration,
  studyDurationError,
} from "@/lib/study-duration";

interface StudyDurationFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  legend?: string;
  description?: string;
  disabled?: boolean;
}

export function StudyDurationField({
  value,
  onChange,
  legend = "Quỹ thời gian mỗi ngày",
  description,
  disabled = false,
}: StudyDurationFieldProps) {
  const initialParts = splitStudyDuration(value);
  const [customMode, setCustomMode] = useState(
    value !== undefined && !STUDY_DURATION_QUICK_CHOICES.some((choice) => choice === value),
  );
  const [hoursInput, setHoursInput] = useState(String(initialParts.hours));
  const [minuteRemainder, setMinuteRemainder] = useState(initialParts.minutes);
  const errorId = useId();

  const parsedHours = Number(hoursInput);
  const customTotal = Number.isInteger(parsedHours)
    ? combineStudyDuration(parsedHours, minuteRemainder)
    : undefined;
  const customError = customMode ? studyDurationError(customTotal) : "";

  function chooseQuickChoice(minutes: number) {
    const parts = splitStudyDuration(minutes);
    setCustomMode(false);
    setHoursInput(String(parts.hours));
    setMinuteRemainder(parts.minutes);
    onChange(minutes);
  }

  function chooseCustom() {
    const parts = splitStudyDuration(value);
    setHoursInput(String(parts.hours));
    setMinuteRemainder(parts.minutes);
    setCustomMode(true);
    onChange(combineStudyDuration(parts.hours, parts.minutes));
  }

  function updateCustom(hoursText: string, minutes: number) {
    setHoursInput(hoursText);
    setMinuteRemainder(minutes);
    if (!hoursText.trim()) {
      onChange(undefined);
      return;
    }
    const hours = Number(hoursText);
    const total = Number.isInteger(hours)
      ? combineStudyDuration(hours, minutes)
      : undefined;
    onChange(isValidStudyDuration(total) ? total : undefined);
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-bold text-slate-700">{legend}</legend>
      {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STUDY_DURATION_QUICK_CHOICES.map((minutes) => (
          <button
            type="button"
            aria-pressed={!customMode && value === minutes}
            key={minutes}
            onClick={() => chooseQuickChoice(minutes)}
            className={`focus-ring rounded-xl border px-2 py-3 text-sm font-bold ${
              !customMode && value === minutes
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {quickStudyDurationLabel(minutes)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={customMode}
          onClick={chooseCustom}
          className={`focus-ring rounded-xl border px-2 py-3 text-sm font-bold ${
            customMode
              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
              : "border-slate-200 text-slate-600"
          }`}
        >
          Tùy chỉnh
        </button>
      </div>

      {customMode ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Giờ</span>
              <Input
                type="number"
                min={0}
                max={8}
                step={1}
                inputMode="numeric"
                value={hoursInput}
                aria-invalid={Boolean(customError)}
                aria-describedby={customError ? errorId : undefined}
                onChange={(event) => updateCustom(event.target.value, minuteRemainder)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Phút</span>
              <Select
                value={minuteRemainder}
                aria-invalid={Boolean(customError)}
                aria-describedby={customError ? errorId : undefined}
                onChange={(event) => updateCustom(hoursInput, Number(event.target.value))}
              >
                {[0, 15, 30, 45].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} phút
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {customError ? (
            <p id={errorId} role="alert" className="mt-3 text-xs font-semibold text-rose-600">
              {customError}
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold text-indigo-700">
              Giá trị lưu: {formatStudyDuration(customTotal as number)}
            </p>
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
