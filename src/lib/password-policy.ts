import { ApiClientError } from "./api-client";

/**
 * Frontend UX Mirror of the Backend Password Policy.
 *
 * NOTE: The backend policy is authoritative.
 * This client-side module provides real-time UX feedback and localization,
 * but does NOT replace server-side validation.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 50;

export interface PasswordRule {
  id: string;
  label: string;
  check: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Từ 8 đến 50 ký tự",
    check: (p: string) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "uppercase",
    label: "Có ít nhất một chữ hoa (A-Z)",
    check: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "digit",
    label: "Có ít nhất một chữ số (0-9)",
    check: (p: string) => /\d/.test(p),
  },
  {
    id: "no-whitespace",
    label: "Không chứa khoảng trắng",
    check: (p: string) => p.length > 0 && !/\s/.test(p),
  },
];

export interface PasswordValidationResult {
  isValid: boolean;
  rules: Array<{ id: string; label: string; ok: boolean }>;
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const rules = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.check(password),
  }));

  const isValid = rules.every((r) => r.ok);
  return { isValid, rules };
}

export const BACKEND_PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  PASSWORD_REQUIRED: "Mật khẩu không được để trống.",
  PASSWORD_TOO_SHORT: "Mật khẩu phải có tối thiểu 8 ký tự.",
  PASSWORD_TOO_LONG: "Mật khẩu không được vượt quá 50 ký tự.",
  PASSWORD_MISSING_UPPERCASE: "Mật khẩu phải chứa ít nhất 1 chữ hoa.",
  PASSWORD_MISSING_DIGIT: "Mật khẩu phải chứa ít nhất 1 chữ số.",
  PASSWORD_CONTAINS_WHITESPACE: "Mật khẩu không được chứa khoảng trắng.",
};

export function resolvePasswordViolationMessage(code?: string, fallbackMessage?: string): string {
  if (code && BACKEND_PASSWORD_ERROR_MESSAGES[code]) {
    return BACKEND_PASSWORD_ERROR_MESSAGES[code];
  }
  return fallbackMessage || "Mật khẩu không thỏa mãn chính sách bảo mật.";
}

export function extractPasswordErrorMessage(
  error: unknown,
  ...fieldNames: string[]
): string | null {
  if (error instanceof ApiClientError && error.details?.violations) {
    const targets = fieldNames.length > 0 ? fieldNames : ["password", "newPassword"];
    const violation = error.details.violations.find((v) => targets.includes(v.field));
    if (violation) {
      return resolvePasswordViolationMessage(violation.code, violation.message);
    }
  }
  return null;
}
