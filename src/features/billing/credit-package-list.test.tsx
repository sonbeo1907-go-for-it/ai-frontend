import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreditPackageList, formatVnd, formatCredits } from "./credit-package-list";
import type { CreditPackageResponse } from "@/types/api";

const mockPackages: CreditPackageResponse[] = [
  {
    id: "pkg-1",
    packageCode: "AI_STARTER_50K",
    name: "Gói Khởi Đầu",
    priceVnd: 50000,
    baseCredits: 5000,
    bonusCredits: 0,
    totalCredits: 5000,
    status: "ACTIVE",
  },
  {
    id: "pkg-2",
    packageCode: "AI_PRO_100K",
    name: "Gói Chuyên Nghiệp",
    priceVnd: 100000,
    baseCredits: 10000,
    bonusCredits: 1000,
    totalCredits: 11000,
    status: "ACTIVE",
  },
];

describe("CreditPackageList", () => {
  it("formats VND and credits correctly as integers", () => {
    expect(formatVnd(50000)).toContain("50.000");
    expect(formatCredits(11000)).toBe("11.000");
  });

  it("renders packages with price, base, bonus and total credits", () => {
    const handleSelect = vi.fn();
    render(
      <CreditPackageList
        packages={mockPackages}
        onSelectPackage={handleSelect}
      />,
    );

    expect(screen.getByText("Gói Khởi Đầu")).toBeTruthy();
    expect(screen.getByText("Gói Chuyên Nghiệp")).toBeTruthy();
    expect(screen.getByText("Thưởng +1.000")).toBeTruthy();
    expect(screen.getByText(/11\.000/)).toBeTruthy();
  });

  it("calls onSelectPackage when Mua ngay button is clicked", () => {
    const handleSelect = vi.fn();
    render(
      <CreditPackageList
        packages={mockPackages}
        onSelectPackage={handleSelect}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "Mua ngay" });
    fireEvent.click(buttons[0]);
    expect(handleSelect).toHaveBeenCalledWith("pkg-1");
  });

  it("shows loading state when purchasingPackageId is active", () => {
    const handleSelect = vi.fn();
    render(
      <CreditPackageList
        packages={mockPackages}
        purchasingPackageId="pkg-2"
        onSelectPackage={handleSelect}
      />,
    );

    expect(screen.getByText("Đang chuyển hướng...")).toBeTruthy();
  });

  it("displays error message when error prop is present", () => {
    render(
      <CreditPackageList
        packages={mockPackages}
        onSelectPackage={vi.fn()}
        error="Cổng thanh toán hiện đang tạm thời gián đoạn."
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Cổng thanh toán hiện đang tạm thời gián đoạn.",
    );
  });
});
