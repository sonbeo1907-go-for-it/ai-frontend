/**
 * Fallback list of standard IANA timezones covering major regions across the globe.
 * Used when `Intl.supportedValuesOf('timeZone')` is not supported by the environment/browser.
 */
export const FALLBACK_IANA_TIMEZONES: readonly string[] = [
  "UTC",
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Kuala_Lumpur",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Athens",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Nairobi",
];

/**
 * Returns the list of valid IANA timezones supported by the runtime/browser.
 * Falls back to FALLBACK_IANA_TIMEZONES if `Intl.supportedValuesOf` is not available.
 */
export function getSupportedTimeZones(): string[] {
  let zones: string[] = [];
  const internationalization = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  if (
    typeof Intl !== "undefined" &&
    typeof internationalization.supportedValuesOf === "function"
  ) {
    try {
      zones = [...internationalization.supportedValuesOf("timeZone")];
    } catch {
      // Fallback on error
    }
  }
  if (!zones || zones.length === 0) {
    return [...FALLBACK_IANA_TIMEZONES];
  }
  const set = new Set(zones);
  for (const fallback of FALLBACK_IANA_TIMEZONES) {
    if (!set.has(fallback) && isValidIanaTimeZone(fallback)) {
      zones.push(fallback);
    }
  }
  return zones.sort((a, b) => a.localeCompare(b));
}

/**
 * Validates if a timezone string is a recognized IANA zone.
 */
export function isValidIanaTimeZone(timeZone: string | undefined | null): boolean {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }
  const trimmed = timeZone.trim();
  if (!trimmed) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely resolves the browser's detected IANA timezone.
 * Returns undefined if detection fails or is invalid.
 */
export function getBrowserDetectedTimeZone(): string | undefined {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && isValidIanaTimeZone(detected)) {
        return detected;
      }
    } catch {
      // Ignore detection errors
    }
  }
  return undefined;
}

/**
 * Formats a timezone for display with its current GMT/UTC offset.
 * Example: "Asia/Ho_Chi_Minh (GMT+7)"
 */
export function formatTimeZoneOption(timeZone: string, locale = "vi-VN"): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((part) => part.type === "timeZoneName");
    const offset = offsetPart ? offsetPart.value : "";
    return offset ? `${timeZone} (${offset})` : timeZone;
  } catch {
    return timeZone;
  }
}
