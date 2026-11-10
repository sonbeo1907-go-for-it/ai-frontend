import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/providers/toast-provider";
import type { DailyPlanItem, DailyPlanTaskStepsResponse } from "@/types/api";
import { TaskStepDialog } from "./task-step-dialog";

const item: DailyPlanItem = {
  id: "item-1",
  versionId: "version-1",
  category: "PRACTICE",
  title: "Thực hành Optional",
  plannedMinutes: 30,
  orderIndex: 0,
  status: "NOT_STARTED",
  createdAt: "2026-09-15T00:00:00Z",
  learningUnitId: "unit-1",
  learningUnitTitle: "Sử dụng Optional an toàn",
  parentTopicTitle: "Java hiện đại",
  steps: [
    {
      id: "step-1",
      entityVersion: 3,
      dailyPlanItemId: "item-1",
      title: "So sánh orElse và orElseGet",
      guidance: "Viết một fallback có side effect.",
      orderIndex: 0,
      estimatedMinutes: 10,
      required: true,
      completed: false,
      stateVersion: 2,
    },
  ],
  stepProgress: {
    requiredCount: 1,
    completedRequiredCount: 0,
    completionPercentage: 0,
    allRequiredStepsCompleted: false,
  },
};

function renderDialog(
  onStepsChanged = vi.fn(),
  options: {
    item?: DailyPlanItem;
    editable?: boolean;
    executable?: boolean;
    onRecordOutcome?: ReturnType<typeof vi.fn>;
  } = {},
) {
  render(
    <ToastProvider>
      <TaskStepDialog
        open
        planId="plan-1"
        versionId="version-1"
        item={options.item ?? item}
        editable={options.editable ?? false}
        executable={options.executable ?? true}
        onClose={vi.fn()}
        onStepsChanged={onStepsChanged}
        onRecordOutcome={options.onRecordOutcome ?? vi.fn()}
      />
    </ToastProvider>,
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetch(
  route?: (url: string, init?: RequestInit) => Response | Promise<Response> | undefined,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const routed = route?.(url, init);
      if (routed) return routed;

      if (url.endsWith("/guidance?page=0&size=10")) {
        return jsonResponse(
          {
            status: 404,
            code: "TASK_GUIDANCE_NOT_FOUND",
            message: "Task Guidance was not found.",
          },
          404,
        );
      }
      if (url.endsWith("/guidance/execution/current")) {
        return jsonResponse(
          {
            status: 404,
            code: "AI_EXECUTION_NOT_FOUND",
            message: "AI execution was not found.",
          },
          404,
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    }),
  );
}

describe("TaskStepDialog", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    installFetch();
  });

  it("uses embedded Task Steps while only recovering Task Guidance on open", async () => {
    renderDialog();

    expect(screen.getByText("So sánh orElse và orElseGet")).not.toBeNull();
    expect(screen.getByText("Đơn vị học: Sử dụng Optional an toàn")).not.toBeNull();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/steps"))).toBe(false);
  });

  it("asks for the parent outcome before completing the final required step", async () => {
    const onStepsChanged = vi.fn();
    const onRecordOutcome = vi.fn();
    renderDialog(onStepsChanged, { onRecordOutcome });

    fireEvent.click(screen.getByRole("checkbox", { name: /Hoàn thành/ }));

    expect(onRecordOutcome).toHaveBeenCalledWith(item, item.steps[0]);
    expect(onStepsChanged).not.toHaveBeenCalled();
    expect(
      vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/steps/step-1/completion")),
    ).toBe(false);
  });

  it("adds a manual step to a DRAFT without reloading the whole plan", async () => {
    const draftItem: DailyPlanItem = {
      ...item,
      steps: [],
      stepProgress: {
        requiredCount: 0,
        completedRequiredCount: 0,
        completionPercentage: 0,
        allRequiredStepsCompleted: false,
      },
    };
    const createdResponse: DailyPlanTaskStepsResponse = {
      dailyPlanItemId: draftItem.id,
      steps: [{ ...item.steps[0], completed: false, stateVersion: null }],
      progress: {
        requiredCount: 1,
        completedRequiredCount: 0,
        completionPercentage: 0,
        allRequiredStepsCompleted: false,
      },
    };
    installFetch((url, init) =>
      url.endsWith("/items/item-1/steps") && init?.method === "POST"
        ? jsonResponse({ data: createdResponse })
        : undefined,
    );
    const onStepsChanged = vi.fn();
    renderDialog(onStepsChanged, { item: draftItem, editable: true, executable: false });

    fireEvent.click(screen.getByRole("button", { name: "Thêm bước" }));
    fireEvent.change(screen.getByLabelText("Tên bước"), {
      target: { value: "So sánh orElse và orElseGet" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm bước" }));

    await waitFor(() => expect(onStepsChanged).toHaveBeenCalledWith(createdResponse));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/daily-plans/plan-1/versions/version-1/items/item-1/steps",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
