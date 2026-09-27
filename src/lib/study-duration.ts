export const STUDY_DURATION_MINUTES_MIN = 15;
export const STUDY_DURATION_MINUTES_MAX = 480;
export const STUDY_DURATION_MINUTES_STEP = 15;
export const STUDY_DURATION_SYSTEM_FALLBACK = 60;

export const STUDY_DURATION_QUICK_CHOICES = [30, 60, 120, 240, 360, 480] as const;

export function isValidStudyDuration(value: number | undefined): value is number {
  return (
    value !== undefined &&
    Number.isInteger(value) &&
    value >= STUDY_DURATION_MINUTES_MIN &&
    value <= STUDY_DURATION_MINUTES_MAX &&
    value % STUDY_DURATION_MINUTES_STEP === 0
  );
}

export function splitStudyDuration(totalMinutes: number | undefined) {
  const safeValue = isValidStudyDuration(totalMinutes)
    ? totalMinutes
    : STUDY_DURATION_MINUTES_MIN;

  return {
    hours: Math.floor(safeValue / 60),
    minutes: safeValue % 60,
  };
}

export function combineStudyDuration(hours: number, minutes: number) {
  return hours * 60 + minutes;
}

export function studyDurationError(totalMinutes: number | undefined) {
  if (totalMinutes === undefined || !Number.isInteger(totalMinutes)) {
    return "Vui lòng nhập quỹ thời gian hợp lệ.";
  }
  if (totalMinutes < STUDY_DURATION_MINUTES_MIN) {
    return "Quỹ thời gian tối thiểu là 15 phút mỗi ngày.";
  }
  if (totalMinutes > STUDY_DURATION_MINUTES_MAX) {
    return "Quỹ thời gian tối đa là 8 giờ mỗi ngày.";
  }
  if (totalMinutes % STUDY_DURATION_MINUTES_STEP !== 0) {
    return "Quỹ thời gian phải theo bước 15 phút.";
  }
  return "";
}

export function formatStudyDuration(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }

  const { hours, minutes } = splitStudyDuration(totalMinutes);
  const hourLabel = `${hours} giờ`;
  const normalized = minutes > 0 ? `${hourLabel} ${minutes} phút` : hourLabel;
  return `${totalMinutes} phút (${normalized})`;
}

export function quickStudyDurationLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }
  return totalMinutes % 60 === 0
    ? `${totalMinutes / 60} giờ`
    : formatStudyDuration(totalMinutes);
}
