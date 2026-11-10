import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiExecution, DailyPlanTaskStep, TaskGuidanceOverview } from "@/types/api";
import { TaskGuidancePanel } from "./task-guidance-panel";

const steps: DailyPlanTaskStep[] = [
  {
    id: "step-1",
    entityVersion: 3,
    dailyPlanItemId: "item-1",
    title: "So sánh orElse và orElseGet",
    orderIndex: 0,
    estimatedMinutes: 10,
    required: true,
    completed: false,
    stateVersion: 1,
  },
];

function guidanceOverview(stale = false): TaskGuidanceOverview {
  const latestRevision = {
    guidanceId: "guidance-1",
    revisionId: "revision-1",
    dailyPlanVersionId: "version-1",
    dailyPlanItemId: "item-1",
    revisionNumber: 1,
    status: "DRAFT" as const,
    latest: true,
    stale,
    objective: "Hiểu cách chọn toán tử Optional phù hợp",
    taskSummary: "Thực hiện một ví dụ nhỏ và so sánh thời điểm fallback được tính.",
    stepGuidances: [
      {
        id: "step-guidance-1",
        taskStepId: stale ? "old-step-1" : "step-1",
        taskStepEntityVersion: 3,
        orderIndex: 0,
        instructions: "Tạo hai Optional và ghi lại khi biểu thức fallback được gọi.",
        expectedResult: "Giải thích được khác biệt về lazy evaluation.",
        tips: "Dùng một hàm fallback có log để quan sát.",
        references: [],
      },
    ],
    references: [
      {
        id: "reference-material",
        provenance: "MATERIAL" as const,
        displayLabel: "Giáo trình Java",
        locator: "Trang 42",
        targetId: "material-1",
        unverified: false,
      },
      {
        id: "reference-source",
        provenance: "LEARNING_SOURCE" as const,
        displayLabel: "Ghi chú Optional",
        targetId: "source-1",
        unverified: false,
      },
      {
        id: "reference-1",
        provenance: "UNVERIFIED_EXTERNAL" as const,
        displayLabel: "Tài liệu Optional tham khảo",
        externalUrl: "https://example.com/optional",
        unverified: true,
      },
    ],
    generatedAt: "2026-09-16T02:00:00Z",
  };

  return {
    guidanceId: "guidance-1",
    dailyPlanVersionId: "version-1",
    dailyPlanItemId: "item-1",
    latestRevision,
    revisions: {
      content: [
        {
          revisionId: "revision-1",
          revisionNumber: 1,
          status: "DRAFT",
          latest: true,
          stale,
          objective: latestRevision.objective,
          generatedAt: latestRevision.generatedAt,
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      first: true,
      last: true,
    },
  };
}

function queuedExecution(operation: "GENERATE" | "REGENERATE" = "GENERATE"): AiExecution {
  return {
    id: "execution-1",
    entityVersion: 0,
    providerConfigId: "provider-config-1",
    purpose: "TASK_GUIDANCE_GENERATION",
    operation,
    targetType: "DAILY_PLAN_ITEM",
    targetId: "item-1",
    status: "QUEUED",
    attemptCount: 0,
    createdAt: "2026-09-16T02:00:00Z",
    updatedAt: "2026-09-16T02:00:00Z",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function missing(code: "TASK_GUIDANCE_NOT_FOUND" | "AI_EXECUTION_NOT_FOUND") {
  return jsonResponse({ status: 404, code, message: "Not found" }, 404);
}

function renderPanel() {
  return render(
    <TaskGuidancePanel
      planId="plan-1"
      versionId="version-1"
      itemId="item-1"
      steps={steps}
      onDirtyChange={vi.fn()}
    />,
  );
}

describe("TaskGuidancePanel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("maps fresh guidance to an exact step and expands it without another request", async () => {
    const overview = guidanceOverview();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("guidance?page=")) return jsonResponse({ data: overview });
        if (url.endsWith("/guidance/execution/current")) {
          return missing("AI_EXECUTION_NOT_FOUND");
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    renderPanel();
    await screen.findByText("Hiểu cách chọn toán tử Optional phù hợp");
    const requestCount = vi.mocked(fetch).mock.calls.length;

    fireEvent.click(
      screen.getByRole("button", { name: /Hướng dẫn AI · Bước 1.*So sánh orElse và orElseGet/ }),
    );

    expect(screen.getByText(/Tạo hai Optional/)).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(requestCount);
    const externalLink = screen.getByRole("link", { name: /Tài liệu Optional tham khảo/ });
    expect(externalLink.getAttribute("target")).toBe("_blank");
    expect(externalLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("Gợi ý chưa xác minh")).not.toBeNull();
    expect(screen.getByText("Tài liệu cá nhân")).not.toBeNull();
    expect(screen.getByText("Nguồn học tập")).not.toBeNull();
  });

  it("keeps stale guidance separate from the current step mapping", async () => {
    const overview = guidanceOverview(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("guidance?page=")) return jsonResponse({ data: overview });
        if (url.endsWith("/guidance/execution/current")) {
          return missing("AI_EXECUTION_NOT_FOUND");
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    renderPanel();

    await screen.findByText(/Checklist đã thay đổi sau khi hướng dẫn này được tạo/);
    expect(screen.getByText("Hướng dẫn bước lịch sử 1")).not.toBeNull();
    expect(screen.queryByText("So sánh orElse và orElseGet")).toBeNull();
  });

  it("queues initial generation with recoverable execution state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("guidance?page=")) return missing("TASK_GUIDANCE_NOT_FOUND");
        if (url.endsWith("/guidance/execution/current")) {
          return missing("AI_EXECUTION_NOT_FOUND");
        }
        if (url.endsWith("/guidance/generate")) {
          return jsonResponse({ data: queuedExecution() });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Tạo hướng dẫn bằng AI" }));

    await screen.findByText("Yêu cầu đang chờ xử lý");
    expect(
      window.sessionStorage.getItem("task-guidance-ai-execution:plan-1:version-1:item-1"),
    ).toBe("execution-1");
  });

  it("recovers a completed execution after the detail view is reopened", async () => {
    const overview = guidanceOverview();
    const completedExecution: AiExecution = {
      ...queuedExecution(),
      status: "SUCCEEDED",
      resultType: "TASK_GUIDANCE_REVISION",
      resultId: "revision-1",
      completedAt: "2026-09-16T02:01:00Z",
    };
    window.sessionStorage.setItem(
      "task-guidance-ai-execution:plan-1:version-1:item-1",
      completedExecution.id,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith(`/api/v1/ai-executions/${completedExecution.id}`)) {
          return jsonResponse({ data: completedExecution });
        }
        if (url.endsWith("/guidance/revision-1")) {
          return jsonResponse({ data: overview.latestRevision });
        }
        if (url.includes("guidance?page=")) return jsonResponse({ data: overview });
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    renderPanel();

    await waitFor(() =>
      expect(
        vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/guidance/revision-1")),
      ).toBe(true),
    );
    expect(
      window.sessionStorage.getItem("task-guidance-ai-execution:plan-1:version-1:item-1"),
    ).toBeNull();
    expect(screen.getByText("Hiểu cách chọn toán tử Optional phù hợp")).not.toBeNull();
  });

  it("sends the optional adjustment when regenerating", async () => {
    const overview = guidanceOverview();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("guidance?page=")) return jsonResponse({ data: overview });
        if (url.endsWith("/guidance/execution/current")) {
          return missing("AI_EXECUTION_NOT_FOUND");
        }
        if (url.endsWith("/guidance/regenerate") && init?.method === "POST") {
          return jsonResponse({ data: queuedExecution("REGENERATE") });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Tạo lại" }));
    const adjustment = screen.getByRole("textbox", { name: /Điều chỉnh mong muốn/ });
    expect(adjustment.getAttribute("maxlength")).toBe("1000");
    fireEvent.change(adjustment, { target: { value: "Dùng ví dụ Java ngắn hơn." } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo phiên bản mới" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/guidance\/regenerate$/),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ adjustmentInstruction: "Dùng ví dụ Java ngắn hơn." }),
        }),
      ),
    );
  });
});
