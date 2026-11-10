import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validatePasswordPolicy,
  resolvePasswordViolationMessage,
  extractPasswordErrorMessage,
  BACKEND_PASSWORD_ERROR_MESSAGES,
} from "./password-policy";
import { ApiClientError } from "./api-client";

describe("Password Policy UX Mirror", () => {
  it("validates a password meeting all requirements", () => {
    const result = validatePasswordPolicy("ValidPass123");
    expect(result.isValid).toBe(true);
    expect(result.rules.every((r) => r.ok)).toBe(true);
  });

  it("fails when password is too short", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    const result = validatePasswordPolicy("Pass1");
    const lengthRule = result.rules.find((r) => r.id === "length");
    expect(lengthRule?.ok).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("fails when password exceeds max length", () => {
    const longPassword = "P1" + "a".repeat(PASSWORD_MAX_LENGTH);
    const result = validatePasswordPolicy(longPassword);
    const lengthRule = result.rules.find((r) => r.id === "length");
    expect(lengthRule?.ok).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("fails when uppercase letter is missing", () => {
    const result = validatePasswordPolicy("lowercase123");
    const upperRule = result.rules.find((r) => r.id === "uppercase");
    expect(upperRule?.ok).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("fails when digit is missing", () => {
    const result = validatePasswordPolicy("PasswordOnly");
    const digitRule = result.rules.find((r) => r.id === "digit");
    expect(digitRule?.ok).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("fails when password contains whitespace", () => {
    const result = validatePasswordPolicy("Pass word123");
    const wsRule = result.rules.find((r) => r.id === "no-whitespace");
    expect(wsRule?.ok).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it("resolves all known backend password error codes", () => {
    expect(resolvePasswordViolationMessage("PASSWORD_TOO_SHORT")).toBe(
      BACKEND_PASSWORD_ERROR_MESSAGES.PASSWORD_TOO_SHORT,
    );
    expect(resolvePasswordViolationMessage("PASSWORD_MISSING_UPPERCASE")).toBe(
      BACKEND_PASSWORD_ERROR_MESSAGES.PASSWORD_MISSING_UPPERCASE,
    );
    expect(resolvePasswordViolationMessage("PASSWORD_MISSING_DIGIT")).toBe(
      BACKEND_PASSWORD_ERROR_MESSAGES.PASSWORD_MISSING_DIGIT,
    );
    expect(resolvePasswordViolationMessage("PASSWORD_CONTAINS_WHITESPACE")).toBe(
      BACKEND_PASSWORD_ERROR_MESSAGES.PASSWORD_CONTAINS_WHITESPACE,
    );
    expect(resolvePasswordViolationMessage("UNKNOWN_CODE", "Fallback")).toBe("Fallback");
  });

  it("extracts password error message from ApiClientError with violations", () => {
    const apiError = new ApiClientError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Request validation failed.",
      violations: [
        {
          field: "password",
          code: "PASSWORD_MISSING_DIGIT",
          message: "Mật khẩu phải chứa ít nhất 1 chữ số.",
        },
      ],
    });

    const message = extractPasswordErrorMessage(apiError, "password");
    expect(message).toBe("Mật khẩu phải chứa ít nhất 1 chữ số.");
  });

  it("returns null when no password violation is found", () => {
    const apiError = new ApiClientError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Request validation failed.",
      violations: [{ field: "email", message: "Email is invalid" }],
    });

    const message = extractPasswordErrorMessage(apiError, "password");
    expect(message).toBeNull();
  });
});
