import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DailyPlanDetailView } from "./daily-plan-detail-view";
import { apiRequest } from "@/lib/api-client";
import type { DailyPlan, DailyPlanVersion } from "@/types/api";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "plan-123" }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

vi.mock("@/features/evaluations/evaluation-api", () => ({
  getDailyEvaluation: vi.fn().mockResolvedValue(null),
}));

const mockPlanActive: DailyPlan = {
  id: "plan-123",
  userId: "user-1",
  roadmapId: "roadmap-1",
  planDate: "2026-10-03",
  timeZoneSnapshot: "Asia/Ho_Chi_Minh",
  status: "IN_PROGRESS",
  availableMinutes: 60,
  activeVersionId: "version-active",
  completedItemsCount: 0,
  totalItemsCount: 2,
  totalPlannedMinutes: 60,
  completionPercentage: 0,
  createdAt: "2026-10-03T00:00:00Z",
  updatedAt: "2026-10-03T00:00:00Z",
};

const mockVersionActive: DailyPlanVersion = {
  id: "version-active",
  planId: "plan-123",
  versionNumber: 1,
  status: "ACTIVE",
  availableMinutes: 60,
  totalPlannedMinutes: 60,
  entityVersion: 0,
  createdAt: "2026-10-03T00:00:00Z",
  items: [
    {
      id: "item-1",
      versionId: "version-active",
      category: "PRACTICE",
      title: "Học Optional trong Java",
      description: "Thực hành orElse và orElseGet",
      plannedMinutes: 30,
      orderIndex: 0,
      status: "IN_PROGRESS",
      createdAt: "2026-10-03T00:00:00Z",
      steps: [],
    },
    {
      id: "item-2",
      versionId: "version-active",
      category: "NEW_MATERIAL",
      title: "Stream API nâng cao",
      plannedMinutes: 30,
      orderIndex: 1,
      status: "NOT_STARTED",
      createdAt: "2026-10-03T00:00:00Z",
      steps: [],
    },
  ],
};

const mockPlanDraft: DailyPlan = {
  ...mockPlanActive,
  status: "DRAFT",
  activeVersionId: null,
};

const mockVersionDraftWithItems: DailyPlanVersion = {
  id: "version-draft",
  planId: "plan-123",
  versionNumber: 2,
  status: "DRAFT",
  availableMinutes: 60,
  totalPlannedMinutes: 30,
  entityVersion: 0,
  createdAt: "2026-10-03T00:00:00Z",
  items: [
    {
      id: "item-draft-1",
      versionId: "version-draft",
      category: "PRACTICE",
      title: "Bài tập nháp 1",
      plannedMinutes: 30,
      orderIndex: 0,
      status: "NOT_STARTED",
      createdAt: "2026-10-03T00:00:00Z",
      steps: [],
    },
  ],
};

const mockVersionDraftEmpty: DailyPlanVersion = {
  ...mockVersionDraftWithItems,
  items: [],
  totalPlannedMinutes: 0,
};

describe("DailyPlanDetailView - US-PLN-UX-02", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1 & AC3: renders single primary action 'Tiếp tục học' and Focus Task Card for active plan in progress", async () => {
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanActive;
      if (url === "/api/v1/daily-plans/plan-123/versions") return [mockVersionActive];
      return {};
    });

    render(<DailyPlanDetailView />);

    await waitFor(() => {
      expect(screen.getAllByText("Học Optional trong Java").length).toBeGreaterThanOrEqual(1);
    });

    // AC1: One primary action highlighted
    expect(screen.getByRole("button", { name: /Tiếp tục học/i })).not.toBeNull();

    // AC3: Task-first Focus Task Card
    expect(screen.getByText(/Nhiệm vụ tiếp theo cần làm/i)).not.toBeNull();
    expect(screen.getByText(/Đang làm dở/i)).not.toBeNull();

    // Version switching belongs to the header; duplicated sidebar cards must not return.
    expect(screen.getByRole("combobox", { name: "Chọn phiên bản kế hoạch" })).not.toBeNull();
    expect(screen.queryByText(/^Phiên bản \(/i)).toBeNull();
    expect(screen.queryByText("Tổng quan ngày")).toBeNull();
  });

  it("AC1 & AC4: renders primary action 'Kích hoạt kế hoạch' and DRAFT banner for DRAFT version with items", async () => {
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanDraft;
      if (url === "/api/v1/daily-plans/plan-123/versions") return [mockVersionDraftWithItems];
      return {};
    });

    render(<DailyPlanDetailView />);

    await waitFor(() => {
      expect(screen.getByText("Bài tập nháp 1")).not.toBeNull();
    });

    // AC1: Primary action for draft with items is "Kích hoạt kế hoạch"
    expect(screen.getByRole("button", { name: /Kích hoạt kế hoạch/i })).not.toBeNull();

    // AC4: Clear explanation of DRAFT state
    expect(screen.getByText(/Chế độ chỉnh sửa \(DRAFT\)/i)).not.toBeNull();
  });

  it("AC1 & AC4: renders 'Thêm nhiệm vụ' as primary action when DRAFT has 0 items", async () => {
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanDraft;
      if (url === "/api/v1/daily-plans/plan-123/versions") return [mockVersionDraftEmpty];
      return {};
    });

    render(<DailyPlanDetailView />);

    await waitFor(() => {
      expect(screen.getByText(/Chưa có nhiệm vụ/i)).not.toBeNull();
    });

    // AC1: Primary action is "Thêm nhiệm vụ"
    expect(screen.getAllByRole("button", { name: /Thêm nhiệm vụ/i }).length).toBeGreaterThanOrEqual(
      1,
    );

    // AC4: Banner notes that items are needed before activation
    expect(screen.getByText(/Cần thêm ít nhất 1 nhiệm vụ để có thể kích hoạt/i)).not.toBeNull();
  });

  it("AC2 & AC5: opens 'Tùy chọn khác' menu and closes with Escape key", async () => {
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanActive;
      if (url === "/api/v1/daily-plans/plan-123/versions") return [mockVersionActive];
      return {};
    });

    render(<DailyPlanDetailView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Tùy chọn khác/i })).not.toBeNull();
    });

    const moreButton = screen.getByRole("button", { name: /Tùy chọn khác/i });
    expect(screen.queryByRole("menu")).toBeNull();

    // Open menu
    fireEvent.click(moreButton);
    expect(screen.getByRole("menu")).not.toBeNull();
    expect(screen.getByText(/Lịch sử tiến độ của ngày/i)).not.toBeNull();
    expect(screen.getByText(/Đồng hồ Pomodoro/i)).not.toBeNull();

    // AC5: Close menu with Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the required-step checklist instead of completing a task prematurely", async () => {
    const versionWithIncompleteRequiredStep: DailyPlanVersion = {
      ...mockVersionActive,
      items: mockVersionActive.items.map((item) =>
        item.id !== "item-1"
          ? item
          : {
              ...item,
              steps: [
                {
                  id: "step-required-1",
                  entityVersion: 0,
                  dailyPlanItemId: item.id,
                  title: "Hoàn thành bước bắt buộc",
                  orderIndex: 0,
                  estimatedMinutes: 10,
                  required: true,
                  completed: false,
                  stateVersion: 0,
                },
              ],
              stepProgress: {
                requiredCount: 1,
                completedRequiredCount: 0,
                completionPercentage: 0,
                allRequiredStepsCompleted: false,
              },
            },
      ),
    };
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanActive;
      if (url === "/api/v1/daily-plans/plan-123/versions") {
        return [versionWithIncompleteRequiredStep];
      }
      return {};
    });

    render(<DailyPlanDetailView />);

    let completeButton: HTMLElement | undefined;
    await waitFor(() => {
      completeButton = screen
        .getAllByRole("button", { name: /^Hoàn thành$/i })
        .find((button) => button.closest("article")?.textContent?.includes("0/1"));
      expect(completeButton).toBeDefined();
    });

    fireEvent.click(completeButton!);

    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByText("Chi tiết nhiệm vụ")).not.toBeNull();
    expect(screen.getByText("Hoàn thành bước bắt buộc")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu tiến độ" })).toBeNull();
  });

  it("allows COMPLETED when the outcome modal will atomically finish the last required step", async () => {
    const requiredSteps = [
      {
        id: "step-required-1",
        entityVersion: 0,
        dailyPlanItemId: "item-1",
        title: "Bước bắt buộc 1",
        orderIndex: 0,
        estimatedMinutes: 10,
        required: true,
        completed: true,
        stateVersion: 1,
      },
      {
        id: "step-required-2",
        entityVersion: 0,
        dailyPlanItemId: "item-1",
        title: "Bước bắt buộc 2",
        orderIndex: 1,
        estimatedMinutes: 10,
        required: true,
        completed: true,
        stateVersion: 1,
      },
      {
        id: "step-required-3",
        entityVersion: 0,
        dailyPlanItemId: "item-1",
        title: "Bước bắt buộc 3",
        orderIndex: 2,
        estimatedMinutes: 10,
        required: true,
        completed: false,
        stateVersion: 0,
      },
    ];
    const versionWithPendingLastRequiredStep: DailyPlanVersion = {
      ...mockVersionActive,
      items: mockVersionActive.items.map((item) =>
        item.id !== "item-1"
          ? item
          : {
              ...item,
              steps: requiredSteps,
              stepProgress: {
                requiredCount: 3,
                completedRequiredCount: 2,
                completionPercentage: 67,
                allRequiredStepsCompleted: false,
              },
            },
      ),
    };
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      if (url === "/api/v1/daily-plans/plan-123") return mockPlanActive;
      if (url === "/api/v1/daily-plans/plan-123/versions") {
        return [versionWithPendingLastRequiredStep];
      }
      return {};
    });

    render(<DailyPlanDetailView />);

    await waitFor(() => {
      expect(screen.getAllByTitle("Xem các bước checklist").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByTitle("Xem các bước checklist")[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Hoàn thành: Bước bắt buộc 3" }));

    const outcomeDialog = await screen.findByRole("dialog");
    expect(within(outcomeDialog).getByText("Hoàn thành bước và nhiệm vụ")).not.toBeNull();

    const completedOption = within(outcomeDialog)
      .getAllByRole("button")
      .find((button) => button.textContent === "Hoàn thành");
    expect(completedOption).toBeDefined();
    expect((completedOption as HTMLButtonElement).disabled).toBe(false);
    expect(completedOption?.getAttribute("aria-pressed")).toBe("true");
    expect(within(outcomeDialog).getByRole("button", { name: "Một phần" })).not.toBeNull();
    expect(within(outcomeDialog).getByRole("button", { name: "Bỏ qua" })).not.toBeNull();
  });
});
