import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminBillingDashboard } from "./admin-billing-dashboard";
import { CreditAdjustmentForm } from "./credit-adjustment-form";
import { PackageForm } from "./package-form";
import { adminBillingApi, type AdminWallet } from "./admin-billing-api";
import { ApiClientError } from "@/lib/api-client";

vi.mock("./admin-billing-api", () => ({
  adminBillingApi: {
    packages: vi.fn(),
    rates: vi.fn(),
    createPackage: vi.fn(),
    updatePackage: vi.fn(),
    packageStatus: vi.fn(),
    createRate: vi.fn(),
    replaceRate: vi.fn(),
    activationPreview: vi.fn(),
    rateStatus: vi.fn(),
    lookup: vi.fn(),
    wallet: vi.fn(),
    adjust: vi.fn(),
  },
}));

const wallet: AdminWallet = {
  userId: "owner",
  email: "user@example.com",
  walletId: "wallet",
  version: 3,
  availableCredits: 100,
  reservedCredits: 20,
  initialized: true,
};

describe("ADMIN billing workflows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    vi.mocked(adminBillingApi.packages).mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.mocked(adminBillingApi.rates).mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.mocked(adminBillingApi.lookup).mockResolvedValue(wallet);
    vi.mocked(adminBillingApi.wallet).mockResolvedValue(wallet);
  });

  it("loads only the selected section", async () => {
    render(<AdminBillingDashboard actorId="admin" />);
    await waitFor(() => expect(adminBillingApi.packages).toHaveBeenCalledOnce());
    expect(adminBillingApi.rates).not.toHaveBeenCalled();
    expect(adminBillingApi.lookup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Giá thao tác AI" }));
    await waitFor(() => expect(adminBillingApi.rates).toHaveBeenCalledOnce());
  });

  it("retries an uncertain adjustment with exactly the same key and body", async () => {
    vi.mocked(adminBillingApi.adjust).mockRejectedValueOnce(new Error("Connection lost"));
    vi.mocked(adminBillingApi.adjust).mockResolvedValueOnce({
      ledgerEntryId: "receipt",
      userId: "owner",
      delta: 10,
      availableCredits: 110,
      reservedCredits: 20,
      recordedAt: "2026-10-11T00:00:00Z",
      replayed: true,
    });
    render(<CreditAdjustmentForm actorId="admin" />);
    fireEvent.change(screen.getByLabelText("Email hoặc mã tài khoản USER"), {
      target: { value: wallet.email },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tìm tài khoản" }));
    await screen.findByText(wallet.email);
    fireEvent.change(screen.getByLabelText("Số Credit"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/^Lý do/), { target: { value: "Support correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra và xác nhận" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận điều chỉnh" }));
    await screen.findByRole("button", { name: "Kiểm tra lại cùng yêu cầu" });
    const first = vi.mocked(adminBillingApi.adjust).mock.calls[0];
    expect(sessionStorage.getItem("admin-billing-adjustment:admin")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại cùng yêu cầu" }));
    await screen.findByText(/không điều chỉnh thêm/);
    expect(vi.mocked(adminBillingApi.adjust).mock.calls[1]).toEqual(first);
    expect(sessionStorage.getItem("admin-billing-adjustment:admin")).toBeNull();
  });

  it("restores the original request after reload instead of generating a new adjustment", async () => {
    const input = { delta: -5, reason: "Correction", version: 1 };
    sessionStorage.setItem(
      "admin-billing-adjustment:admin",
      JSON.stringify({ userId: "owner", key: "original", input }),
    );
    vi.mocked(adminBillingApi.adjust).mockResolvedValue({
      ledgerEntryId: "receipt",
      userId: "owner",
      delta: -5,
      availableCredits: 95,
      reservedCredits: 20,
      recordedAt: "2026-10-11T00:00:00Z",
      replayed: true,
    });
    render(<CreditAdjustmentForm actorId="admin" />);
    fireEvent.click(await screen.findByRole("button", { name: "Kiểm tra lại yêu cầu đang chờ" }));
    await waitFor(() =>
      expect(adminBillingApi.adjust).toHaveBeenCalledWith("owner", "original", input),
    );
  });

  it("retains package form input after a version conflict without blindly retrying", async () => {
    vi.mocked(adminBillingApi.updatePackage).mockRejectedValue(
      new ApiClientError({
        status: 409,
        code: "CONCURRENT_MODIFICATION",
        message: "Reload",
        timestamp: "",
        path: "",
        requestId: "test",
      }),
    );
    render(
      <PackageForm
        item={{
          id: "package",
          version: 0,
          packageCode: "TEST",
          name: "Old",
          priceVnd: 50000,
          baseCredits: 5000,
          bonusCredits: 0,
          totalCredits: 5000,
          sortOrder: 0,
          status: "ACTIVE",
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Tên gói"), { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu gói" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Tên gói") as HTMLInputElement).value).toBe("New name");
    expect(screen.getByRole("button", { name: "Lưu gói" }).hasAttribute("disabled")).toBe(true);
    expect(adminBillingApi.updatePackage).toHaveBeenCalledOnce();
  });
});
