export const ROADMAP_COMMITMENT_MINUTES_MIN = 15;
export const ROADMAP_COMMITMENT_MINUTES_MAX = 480;
export const ROADMAP_COMMITMENT_MINUTES_STEP = 15;

export const ROADMAP_COMMITMENT_QUICK_CHOICES = [30, 60, 120, 240, 360, 480] as const;

export function isValidRoadmapCommitment(value: number | undefined): value is number {
  return (
    value !== undefined &&
    Number.isInteger(value) &&
    value >= ROADMAP_COMMITMENT_MINUTES_MIN &&
    value <= ROADMAP_COMMITMENT_MINUTES_MAX &&
    value % ROADMAP_COMMITMENT_MINUTES_STEP === 0
  );
}

export function splitCommitmentMinutes(totalMinutes: number | undefined) {
  const safeValue = isValidRoadmapCommitment(totalMinutes)
    ? totalMinutes
    : ROADMAP_COMMITMENT_MINUTES_MIN;

  return {
    hours: Math.floor(safeValue / 60),
    minutes: safeValue % 60,
  };
}

export function combineCommitmentMinutes(hours: number, minutes: number) {
  return hours * 60 + minutes;
}

export function roadmapCommitmentError(totalMinutes: number | undefined) {
  if (totalMinutes === undefined || !Number.isInteger(totalMinutes)) {
    return "Vui lòng nhập quỹ thời gian hợp lệ.";
  }
  if (totalMinutes < ROADMAP_COMMITMENT_MINUTES_MIN) {
    return "Quỹ thời gian tối thiểu là 15 phút mỗi ngày.";
  }
  if (totalMinutes > ROADMAP_COMMITMENT_MINUTES_MAX) {
    return "Quỹ thời gian tối đa là 8 giờ mỗi ngày.";
  }
  if (totalMinutes % ROADMAP_COMMITMENT_MINUTES_STEP !== 0) {
    return "Quỹ thời gian phải theo bước 15 phút.";
  }
  return "";
}

export function formatRoadmapCommitment(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }

  const { hours, minutes } = splitCommitmentMinutes(totalMinutes);
  const hourLabel = `${hours} giờ`;
  const normalized = minutes > 0 ? `${hourLabel} ${minutes} phút` : hourLabel;
  return `${totalMinutes} phút (${normalized})`;
}

export function quickCommitmentLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }
  return totalMinutes % 60 === 0
    ? `${totalMinutes / 60} giờ`
    : formatRoadmapCommitment(totalMinutes);
}
