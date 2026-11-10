import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoadmapOnboarding } from "@/types/api";
import { apiRequest } from "@/lib/api-client";
import { RoadmapOnboardingForm } from "./roadmap-onboarding-form";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn(),
  getErrorMessage: (error: unknown) => String(error),
}));

vi.mock("./roadmap-ai-generation-modal", () => ({
  RoadmapAiGenerationModal: () => <div>AI modal</div>,
}));

vi.mock("./roadmap-ai-execution-api", () => ({
  queueRoadmapGeneration: vi.fn(),
  rememberRoadmapAiExecution: vi.fn(),
}));

const initialRecord: RoadmapOnboarding = {
  roadmapId: "roadmap-1",
  version: 0,
  status: "ONBOARDING",
  titleOrigin: "FALLBACK",
  completed: false,
};

describe("RoadmapOnboardingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiRequest).mockReset();
  });

  it("saves an explicit title and the observed entity version before advancing", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(initialRecord)
      .mockResolvedValueOnce({
        ...initialRecord,
        version: 1,
        title: "Backend Java thực chiến",
        titleOrigin: "USER",
        goal: "Xây dựng REST API hoàn chỉnh",
      });

    render(<RoadmapOnboardingForm />);

    fireEvent.change(await screen.findByPlaceholderText("Ví dụ: Backend Java thực chiến"), {
      target: { value: "Backend Java thực chiến" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Ví dụ: Học Spring Boot để tự xây dựng REST API hoàn chỉnh…"),
      {
        target: { value: "Xây dựng REST API hoàn chỉnh" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Tiếp theo/ }));

    await screen.findByText("Trình độ hiện tại của bạn");
    const [, options] = vi.mocked(apiRequest).mock.calls[1];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      title: "Backend Java thực chiến",
      goal: "Xây dựng REST API hoàn chỉnh",
      entityVersion: 0,
    });
  });

  it("resumes a complete saved survey at the confirmation step", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      ...initialRecord,
      version: 3,
      title: "React Frontend",
      titleOrigin: "USER",
      goal: "Xây dựng giao diện React",
      proficiencyLevel: "BASIC",
      dailyCommitmentMinutes: 60,
      expectedDurationDays: 60,
    });

    render(<RoadmapOnboardingForm />);

    await waitFor(() => expect(screen.getByText("Kiểm tra trước khi tạo lộ trình")).toBeTruthy());
    expect(screen.getByText("React Frontend")).toBeTruthy();
    expect(screen.getByText("60 phút (1 giờ)/ngày")).toBeTruthy();
    expect(screen.getByLabelText("Bước 4 trên 4")).toBeTruthy();
  });

  it("persists the current step before Back navigation", async () => {
    const completeRecord: RoadmapOnboarding = {
      ...initialRecord,
      version: 3,
      title: "React Frontend",
      titleOrigin: "USER",
      goal: "Xây dựng giao diện React",
      proficiencyLevel: "BASIC",
      dailyCommitmentMinutes: 60,
      expectedDurationDays: 60,
    };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(completeRecord)
      .mockResolvedValueOnce({ ...completeRecord, version: 4, dailyCommitmentMinutes: 120 });

    render(<RoadmapOnboardingForm />);

    fireEvent.click(await screen.findByRole("button", { name: "Sửa cam kết" }));
    fireEvent.click(screen.getByRole("button", { name: "2 giờ" }));
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));

    await screen.findByText("Trình độ hiện tại của bạn");
    const [, options] = vi.mocked(apiRequest).mock.calls[1];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      dailyCommitmentMinutes: 120,
      entityVersion: 3,
    });
  });

  it("keeps entered values when a save fails", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(initialRecord)
      .mockRejectedValueOnce(new Error("Network unavailable"));

    render(<RoadmapOnboardingForm />);

    const goalInput = await screen.findByPlaceholderText(
      "Ví dụ: Học Spring Boot để tự xây dựng REST API hoàn chỉnh…",
    );
    fireEvent.change(goalInput, { target: { value: "Học Spring Boot" } });
    fireEvent.click(screen.getByRole("button", { name: /Tiếp theo/ }));

    await screen.findByRole("alert");
    expect((goalInput as HTMLTextAreaElement).value).toBe("Học Spring Boot");
    expect(screen.getByText("Đặt tên và mục tiêu cho lộ trình")).toBeTruthy();
  });

  it("resumes a custom commitment and displays its normalized value", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      ...initialRecord,
      version: 3,
      title: "Backend Java",
      titleOrigin: "USER",
      goal: "Học Spring Boot",
      proficiencyLevel: "BASIC",
      dailyCommitmentMinutes: 270,
      expectedDurationDays: 60,
    });

    render(<RoadmapOnboardingForm />);

    expect(await screen.findByText("270 phút (4 giờ 30 phút)/ngày")).toBeTruthy();
  });

  it("supports an eight-hour quick choice and persists 480 minutes", async () => {
    const stepThreeRecord: RoadmapOnboarding = {
      ...initialRecord,
      version: 2,
      goal: "Học Spring Boot",
      proficiencyLevel: "BASIC",
    };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(stepThreeRecord)
      .mockResolvedValueOnce({
        ...stepThreeRecord,
        version: 3,
        dailyCommitmentMinutes: 480,
        expectedDurationDays: 90,
      });

    render(<RoadmapOnboardingForm />);

    fireEvent.click(await screen.findByRole("button", { name: "8 giờ" }));
    fireEvent.click(screen.getByRole("button", { name: "90 ngày" }));
    fireEvent.click(screen.getByRole("button", { name: /Tiếp theo/ }));

    await screen.findByText("Kiểm tra trước khi tạo lộ trình");
    const [, options] = vi.mocked(apiRequest).mock.calls[1];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      dailyCommitmentMinutes: 480,
      expectedDurationDays: 90,
      entityVersion: 2,
    });
  });
});
