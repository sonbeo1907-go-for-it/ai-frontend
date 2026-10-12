export function integer(value: string, minimum = 0): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

export function credits(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function category(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}
