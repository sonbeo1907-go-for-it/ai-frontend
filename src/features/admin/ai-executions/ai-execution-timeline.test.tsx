import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiExecutionTimeline } from "./ai-execution-timeline";
import type { AdminAiExecutionTimelineEvent } from "@/types/api";

describe("AiExecutionTimeline", () => {
  it("renders empty state message when events list is empty or undefined", () => {
    render(<AiExecutionTimeline events={[]} />);
    expect(screen.getByText(/Chưa có mốc sự kiện nào/i)).toBeDefined();
  });

  it("handles synthetic events with null timestamp without crashing or rendering date", () => {
    const events: AdminAiExecutionTimelineEvent[] = [
      {
        eventName: "QUEUED",
        timestamp: "2026-09-30T10:00:00Z",
        synthetic: false,
      },
      {
        eventName: "RETRY (Attempt 2)",
        timestamp: null,
        synthetic: true,
      },
      {
        eventName: "SUCCEEDED",
        timestamp: "2026-09-30T10:01:00Z",
        synthetic: false,
      },
    ];

    render(<AiExecutionTimeline events={events} />);

    // Check that RETRY synthetic event is rendered
    expect(screen.getByText("RETRY (Attempt 2)")).toBeDefined();
    expect(screen.getByText("Synthetic")).toBeDefined();
    expect(screen.getByText(/Không ghi nhận thời gian/i)).toBeDefined();

    // Check non-synthetic events have eventName
    expect(screen.getByText("QUEUED")).toBeDefined();
    expect(screen.getByText("SUCCEEDED")).toBeDefined();
  });
});
