import { describe, expect, it } from "vitest";
import {
  combineCommitmentMinutes,
  formatRoadmapCommitment,
  isValidRoadmapCommitment,
  ROADMAP_COMMITMENT_QUICK_CHOICES,
  roadmapCommitmentError,
  splitCommitmentMinutes,
} from "./roadmap-commitment";

describe("roadmap commitment", () => {
  it("accepts the full 15-to-480-minute domain in 15-minute increments", () => {
    expect(isValidRoadmapCommitment(15)).toBe(true);
    expect(isValidRoadmapCommitment(270)).toBe(true);
    expect(isValidRoadmapCommitment(480)).toBe(true);

    expect(isValidRoadmapCommitment(0)).toBe(false);
    expect(isValidRoadmapCommitment(14)).toBe(false);
    expect(isValidRoadmapCommitment(37)).toBe(false);
    expect(isValidRoadmapCommitment(481)).toBe(false);
  });

  it("offers the agreed quick choices", () => {
    expect(ROADMAP_COMMITMENT_QUICK_CHOICES).toEqual([30, 60, 120, 240, 360, 480]);
  });

  it("converts custom hours and minutes without losing precision", () => {
    expect(combineCommitmentMinutes(4, 30)).toBe(270);
    expect(splitCommitmentMinutes(270)).toEqual({ hours: 4, minutes: 30 });
    expect(formatRoadmapCommitment(270)).toBe("270 phút (4 giờ 30 phút)");
  });

  it("explains values outside the supported range", () => {
    expect(roadmapCommitmentError(0)).toContain("15 phút");
    expect(roadmapCommitmentError(495)).toContain("8 giờ");
  });
});
