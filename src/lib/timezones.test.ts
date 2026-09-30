import { describe, expect, it } from "vitest";
import {
  FALLBACK_IANA_TIMEZONES,
  formatTimeZoneOption,
  getBrowserDetectedTimeZone,
  getSupportedTimeZones,
  isValidIanaTimeZone,
} from "./timezones";

describe("timezones utility", () => {
  it("provides supported IANA timezones including common ones", () => {
    const zones = getSupportedTimeZones();
    expect(zones.length).toBeGreaterThan(10);
    expect(zones).toContain("Asia/Ho_Chi_Minh");
    expect(zones).toContain("UTC");
  });

  it("validates valid IANA timezones correctly", () => {
    expect(isValidIanaTimeZone("Asia/Ho_Chi_Minh")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("Europe/London")).toBe(true);
  });

  it("rejects invalid, free-text or blank timezones", () => {
    expect(isValidIanaTimeZone("")).toBe(false);
    expect(isValidIanaTimeZone("   ")).toBe(false);
    expect(isValidIanaTimeZone(null)).toBe(false);
    expect(isValidIanaTimeZone(undefined)).toBe(false);
    expect(isValidIanaTimeZone("UTC+7")).toBe(false);
    expect(isValidIanaTimeZone("Vietnam")).toBe(false);
    expect(isValidIanaTimeZone("abc")).toBe(false);
    expect(isValidIanaTimeZone("Unknown/InvalidCity")).toBe(false);
  });

  it("safely detects browser timezone or returns undefined", () => {
    const detected = getBrowserDetectedTimeZone();
    if (detected !== undefined) {
      expect(isValidIanaTimeZone(detected)).toBe(true);
    }
  });

  it("formats timezone option with offset label", () => {
    const label = formatTimeZoneOption("Asia/Ho_Chi_Minh");
    expect(label).toContain("Asia/Ho_Chi_Minh");
    expect(label).toMatch(/GMT\+7|UTC\+7/);
  });

  it("has non-empty fallback list", () => {
    expect(FALLBACK_IANA_TIMEZONES.length).toBeGreaterThan(20);
    expect(FALLBACK_IANA_TIMEZONES).toContain("UTC");
    expect(FALLBACK_IANA_TIMEZONES).toContain("Asia/Ho_Chi_Minh");
  });
});
