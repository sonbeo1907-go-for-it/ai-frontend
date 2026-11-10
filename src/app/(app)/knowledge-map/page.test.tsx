import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api-client";
import { fetchKnowledgeMap, fetchWeakTopicsTimeline } from "@/features/reports/report-api";
import type { KnowledgeMapResponse } from "@/types/api";
import KnowledgeMapPage from "./page";

let userId = "user-1";
vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ profile: { id: userId } }),
}));
vi.mock("@/lib/api-client", async () => ({
  ...(await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")),
  apiRequest: vi.fn(),
}));
vi.mock("@/features/reports/report-api", () => ({
  fetchKnowledgeMap: vi.fn(),
  fetchWeakTopicsTimeline: vi.fn(),
}));

const report: KnowledgeMapResponse = {
  roadmapId: "roadmap-1",
  roadmapTitle: "Roadmap ready",
  totalMilestones: 0,
  totalTopics: 0,
  masteredTopics: 0,
  totalLearningUnits: 0,
  masteredLearningUnits: 0,
  masteryPercentage: 0,
  milestones: [],
};

describe("KnowledgeMapPage loading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    userId = "user-1";
    vi.mocked(apiRequest).mockResolvedValue({ content: [] });
    vi.mocked(fetchKnowledgeMap).mockResolvedValue(report);
    vi.mocked(fetchWeakTopicsTimeline).mockResolvedValue([]);
  });

  it("renders controls immediately and map data without waiting for the Roadmap selector or Timeline", async () => {
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));
    render(<KnowledgeMapPage />);
    expect(screen.getByRole("tab", { name: /Tiến độ mục tiêu/ })).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Chọn lộ trình" })).not.toBeNull();
    expect(await screen.findByText("Roadmap ready")).not.toBeNull();
    expect(fetchWeakTopicsTimeline).not.toHaveBeenCalled();
    expect(fetchKnowledgeMap).toHaveBeenCalledTimes(1);
  });

  it("lazy-loads Timeline on first open and refreshes only that tab", async () => {
    render(<KnowledgeMapPage />);
    await screen.findByText("Roadmap ready");
    expect(screen.queryByText("Đã vượt qua thành công")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Nhật ký Điểm yếu/ }));
    await screen.findByText("Không có ghi nhận điểm yếu nào");
    expect(fetchWeakTopicsTimeline).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("tab", { name: /Tiến độ mục tiêu/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Nhật ký Điểm yếu/ }));
    expect(fetchWeakTopicsTimeline).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Làm mới" }));
    await waitFor(() => expect(fetchWeakTopicsTimeline).toHaveBeenCalledTimes(2));
    expect(fetchKnowledgeMap).toHaveBeenCalledTimes(1);
  });

  it("does not fetch Timeline or mount its view when no default Roadmap exists", async () => {
    vi.mocked(fetchKnowledgeMap).mockResolvedValue({
      ...report,
      roadmapId: null,
      roadmapTitle: null,
    });
    render(<KnowledgeMapPage />);
    await screen.findByText("Chưa chọn lộ trình");
    expect(screen.queryByText("Đã vượt qua thành công")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Nhật ký Điểm yếu/ }));
    await screen.findByText("Không có ghi nhận điểm yếu nào");
    expect(fetchWeakTopicsTimeline).not.toHaveBeenCalled();
  });

  it("clears cached report data when the authenticated account changes", async () => {
    const { rerender } = render(<KnowledgeMapPage />);
    await screen.findByText("Roadmap ready");
    vi.mocked(fetchKnowledgeMap).mockReturnValue(new Promise(() => {}));
    userId = "user-2";
    await act(async () => rerender(<KnowledgeMapPage />));
    expect(screen.queryByText("Roadmap ready")).toBeNull();
    expect(fetchKnowledgeMap).toHaveBeenCalledTimes(2);
  });

  it("preserves map controls across tab switches and selecting the same resolved Roadmap", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      content: [{ id: "roadmap-1", title: "Roadmap ready", status: "ACTIVE" }],
    });
    render(<KnowledgeMapPage />);
    const search = await screen.findByPlaceholderText("Tìm kiếm chủ đề hoặc bài học...");
    fireEvent.change(search, { target: { value: "remember this search" } });
    fireEvent.click(screen.getByRole("tab", { name: /Nhật ký Điểm yếu/ }));
    await screen.findByText("Không có ghi nhận điểm yếu nào");
    fireEvent.click(screen.getByRole("tab", { name: /Tiến độ mục tiêu/ }));
    await screen.findByRole("option", { name: "Roadmap ready (Đang học)" });
    fireEvent.change(screen.getByRole("combobox", { name: "Chọn lộ trình" }), {
      target: { value: "roadmap-1" },
    });
    expect(
      (screen.getByPlaceholderText("Tìm kiếm chủ đề hoặc bài học...") as HTMLInputElement).value,
    ).toBe("remember this search");
    expect(fetchKnowledgeMap).toHaveBeenCalledTimes(1);
  });
});
