import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayDailyPlanPage from "./page";
import { dailyPlanApi } from "@/features/daily/daily-plan-api";
import { ApiClientError } from "@/lib/api-client";
import type { DailyPlan } from "@/types/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    profile: {
      profile: {
        timeZone: "Asia/Ho_Chi_Minh",
        defaultDailyMinutes: 60,
      },
    },
  }),
}));

vi.mock("@/components/providers/toast-provider", () => ({
  useToast: () => ({
    show: vi.fn(),
  }),
}));

describe("TodayDailyPlanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC2: redirects to existing today plan when plan exists", async () => {
    const mockPlan = {
      id: "plan-today-123",
      planDate: "2026-10-02",
      status: "IN_PROGRESS",
    } as unknown as DailyPlan;

    vi.spyOn(dailyPlanApi, "getTodayPlan").mockResolvedValue(mockPlan);

    render(<TodayDailyPlanPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/daily-plans/plan-today-123");
    });
  });

  it("AC3: renders empty state with manual and AI options when no plan exists for today", async () => {
    vi.spyOn(dailyPlanApi, "getTodayPlan").mockResolvedValue(null);

    render(<TodayDailyPlanPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Chưa có kế hoạch học tập cho hôm nay/i }),
      ).not.toBeNull();
    });

    expect(
      screen.getByRole("button", { name: /Tạo kế hoạch thủ công/i }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /Sinh kế hoạch bằng AI/i }),
    ).not.toBeNull();
  });

  it("Exception Flow: shows error card with retry and request ID on server failure", async () => {
    const error = new ApiClientError({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Máy chủ gặp sự cố khi tải kế hoạch",
      requestId: "req-err-999",
    });

    vi.spyOn(dailyPlanApi, "getTodayPlan").mockRejectedValue(error);

    render(<TodayDailyPlanPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Không thể tải kế hoạch hôm nay/i }),
      ).not.toBeNull();
    });

    expect(screen.getByText(/Máy chủ gặp sự cố khi tải kế hoạch/i)).not.toBeNull();
    expect(screen.getByText(/req-err-999/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /Thử lại/i })).not.toBeNull();
  });
});
