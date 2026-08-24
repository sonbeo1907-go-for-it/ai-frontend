export function formatDate(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(
    "vi-VN",
    options ?? { day: "2-digit", month: "2-digit", year: "numeric" },
  ).format(new Date(value));
}
export function formatBytes(value?: number) {
  if (value == null) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
export function todayIso(timeZone = "Asia/Ho_Chi_Minh") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function initials(name?: string) {
  return (name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
