import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordPolicyHints } from "./password-policy-hints";

describe("PasswordPolicyHints Component", () => {
  it("renders all four policy rules", () => {
    render(<PasswordPolicyHints password="" />);

    expect(screen.getByText("Từ 8 đến 50 ký tự")).toBeDefined();
    expect(screen.getByText("Có ít nhất một chữ hoa (A-Z)")).toBeDefined();
    expect(screen.getByText("Có ít nhất một chữ số (0-9)")).toBeDefined();
    expect(screen.getByText("Không chứa khoảng trắng")).toBeDefined();
  });

  it("marks rules as satisfied when matching password is typed", () => {
    const { rerender } = render(<PasswordPolicyHints password="weak" />);

    // Initially short, no uppercase, no digit -> none satisfied except no-whitespace
    const noWsItem = screen.getByText("Không chứa khoảng trắng").closest("li");
    expect(noWsItem?.className).toContain("text-emerald-600");

    const lengthItem = screen.getByText("Từ 8 đến 50 ký tự").closest("li");
    expect(lengthItem?.className).not.toContain("text-emerald-600");

    // Rerender with valid password
    rerender(<PasswordPolicyHints password="ValidPass123" />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.className).toContain("text-emerald-600");
    }
  });
});
