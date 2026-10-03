import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DailyPlansView } from "./daily-plans-view";
import { dailyPlanApi } from "./daily-plan-api";
import { apiRequest } from "@/lib/api-client";
import type { DailyPlanSummary, PageResponse, RoadmapSummary } from "@/types/api";

const mockReplace = vi.fn();
let currentSearchString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => "/daily-plans",
  useSearchParams: () => new URLSearchParams(currentSearchString),
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

vi.mock("./daily-plan-api", async () => {
  const actual = await vi.importActual<typeof import("./daily-plan-api")>("./daily-plan-api");
  return {
    ...actual,
    dailyPlanApi: {
      ...actual.dailyPlanApi,
      getDailyPlans: vi.fn(),
    },
  };
});

const samplePlan: DailyPlanSummary = {
  id: "plan-1",
  userId: "user-1",
  planDate: "2026-10-03",
  timeZoneSnapshot: "Asia/Ho_Chi_Minh",
  status: "READY",
  availableMinutes: 60,
  activeVersionId: "version-1",
  latestVersionId: "version-1",
  latestVersionNumber: 1,
  completedItemsCount: 1,
  totalItemsCount: 2,
  totalPlannedMinutes: 45,
  completionPercentage: 50,
  createdAt: "2026-10-03T07:00:00Z",
  updatedAt: "2026-10-03T07:00:00Z",
};

const emptyPageResponse: PageResponse<DailyPlanSummary> = {
  content: [],
  page: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const populatedPageResponse: PageResponse<DailyPlanSummary> = {
  content: [samplePlan],
  page: 0,
  size: 12,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

const multiPageResponse: PageResponse<DailyPlanSummary> = {
  content: [samplePlan],
  page: 0,
  size: 12,
  totalElements: 25,
  totalPages: 3,
  first: true,
  last: false,
};

const sampleRoadmaps: RoadmapSummary[] = [
  {
    id: "roadmap-1",
    title: "Java Backend Master",
    status: "ACTIVE",
    targetRole: "BACKEND_DEVELOPER",
    totalWeeks: 12,
    totalPlannedMinutes: 1200,
    currentVersionNumber: 1,
    activeVersionNumber: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("US-PLN-UX-03 DailyPlansView search and filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchString = "";
    vi.mocked(dailyPlanApi.getDailyPlans).mockResolvedValue(populatedPageResponse);
    vi.mocked(apiRequest).mockResolvedValue({
      content: sampleRoadmaps,
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    });
  });

  it("renders default filter controls and calls API with default params", async () => {
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(dailyPlanApi.getDailyPlans).toHaveBeenCalledWith(
        expect.objectContaining({
          from: undefined,
          to: undefined,
          status: undefined,
          roadmapId: undefined,
          page: 0,
          size: 12,
          sort: "planDate,desc",
        }),
      );
    });

    expect(screen.getByText("Bộ lọc & Tìm kiếm")).not.toBeNull();
    expect(screen.getByLabelText("Từ ngày")).not.toBeNull();
    expect(screen.getByLabelText("Đến ngày")).not.toBeNull();
    expect(screen.getByLabelText("Trạng thái")).not.toBeNull();
    expect(screen.getByLabelText("Lộ trình")).not.toBeNull();
    expect(screen.getByLabelText("Sắp xếp")).not.toBeNull();
  });

  it("AC1 — updates URL with single date when clicking quick 'Hôm nay' button", async () => {
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Chọn ngày hôm nay" })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Chọn ngày hôm nay" }));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringMatching(/\/daily-plans\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/),
    );
  });

  it("AC2 — updates URL when date range is selected", async () => {
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(screen.getByLabelText("Từ ngày")).not.toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Từ ngày"), {
      target: { value: "2026-10-01" },
    });

    expect(mockReplace).toHaveBeenCalledWith("/daily-plans?from=2026-10-01");
  });

  it("AC2 — displays validation alert when fromDate is after toDate", async () => {
    currentSearchString = "from=2026-10-10&to=2026-10-01";
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Khoảng ngày không hợp lệ: 'Từ ngày' phải trước hoặc bằng 'Đến ngày'/i),
      ).not.toBeNull();
    });

    // When date range is invalid, API search should not be triggered
    expect(dailyPlanApi.getDailyPlans).not.toHaveBeenCalled();
  });

  it("AC3 — filters by status and roadmap", async () => {
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(screen.getByLabelText("Trạng thái")).not.toBeNull();
      expect(screen.getByLabelText("Lộ trình")).not.toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Trạng thái"), {
      target: { value: "READY" },
    });

    expect(mockReplace).toHaveBeenCalledWith("/daily-plans?status=READY");

    fireEvent.change(screen.getByLabelText("Lộ trình"), {
      target: { value: "roadmap-1" },
    });

    expect(mockReplace).toHaveBeenCalledWith("/daily-plans?roadmapId=roadmap-1");
  });

  it("AC4 — retains filters when navigating to next page or changing sort", async () => {
    currentSearchString = "status=IN_PROGRESS&roadmapId=roadmap-1";
    vi.mocked(dailyPlanApi.getDailyPlans).mockResolvedValue(multiPageResponse);

    render(<DailyPlansView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Trang sau" })).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/daily-plans?status=IN_PROGRESS&roadmapId=roadmap-1&page=1",
    );

    fireEvent.change(screen.getByLabelText("Sắp xếp"), {
      target: { value: "planDate,asc" },
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/daily-plans?status=IN_PROGRESS&roadmapId=roadmap-1&sort=planDate%2Casc",
    );
  });

  it("AC5 — restores filters from URL query parameters", async () => {
    currentSearchString = "from=2026-10-01&to=2026-10-05&status=COMPLETED&sort=planDate,asc&page=2";
    render(<DailyPlansView />);

    await waitFor(() => {
      expect(dailyPlanApi.getDailyPlans).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "2026-10-01",
          to: "2026-10-05",
          status: "COMPLETED",
          page: 2,
          sort: "planDate,asc",
        }),
      );
    });

    expect((screen.getByLabelText("Từ ngày") as HTMLInputElement).value).toBe("2026-10-01");
    expect((screen.getByLabelText("Đến ngày") as HTMLInputElement).value).toBe("2026-10-05");
    expect((screen.getByLabelText("Trạng thái") as HTMLSelectElement).value).toBe("COMPLETED");
    expect((screen.getByLabelText("Sắp xếp") as HTMLSelectElement).value).toBe("planDate,asc");
  });

  it("AC6 — shows empty filter state with clear filter button when no results match", async () => {
    currentSearchString = "status=CANCELLED";
    vi.mocked(dailyPlanApi.getDailyPlans).mockResolvedValue(emptyPageResponse);

    render(<DailyPlansView />);

    await waitFor(() => {
      expect(screen.getByText("Không tìm thấy kế hoạch phù hợp")).not.toBeNull();
    });

    expect(
      screen.getByText(/Không có Daily Plan nào khớp với các tiêu chí tìm kiếm/i),
    ).not.toBeNull();

    const clearButton = screen.getAllByRole("button", { name: "Xóa bộ lọc" })[0];
    expect(clearButton).not.toBeNull();

    fireEvent.click(clearButton);
    expect(mockReplace).toHaveBeenCalledWith("/daily-plans");
  });
});
