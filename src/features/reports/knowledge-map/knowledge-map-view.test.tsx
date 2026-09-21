import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnowledgeMapView } from "./knowledge-map-view";
import { WeakTopicsTimelineView } from "./weak-topics-timeline-view";
import type { KnowledgeMapResponse, WeakTopicTimelineItem } from "@/types/api";

const mockMapData: KnowledgeMapResponse = {
  roadmapId: "roadmap-1",
  roadmapTitle: "Java Backend Roadmap",
  totalMilestones: 1,
  totalTopics: 2,
  masteredTopics: 1,
  totalLearningUnits: 3,
  masteredLearningUnits: 2,
  masteryPercentage: 66.7,
  milestones: [
    {
      id: "m-1",
      title: "Cột mốc 1: Java Core",
      description: "Nền tảng ngôn ngữ",
      orderIndex: 0,
      topics: [
        {
          id: "t-1",
          title: "OOP trong Java",
          description: "Lập trình hướng đối tượng",
          orderIndex: 0,
          estimatedMinutes: 120,
          mastered: true,
          status: "COMPLETED",
          completionPercentage: 100,
          masteredAt: "2026-03-05T00:00:00Z",
          learningUnits: [
            {
              id: "u-1",
              title: "Tính Đa hình",
              description: "Polymorphism",
              orderIndex: 0,
              estimatedMinutes: 60,
              mastered: true,
              status: "COMPLETED",
              masteredAt: "2026-03-05T00:00:00Z",
              unresolvedWeakTopic: false,
            },
          ],
        },
        {
          id: "t-2",
          title: "Java Collections",
          description: "List, Map, Set",
          orderIndex: 1,
          estimatedMinutes: 120,
          mastered: false,
          status: "IN_PROGRESS",
          completionPercentage: 50,
          masteredAt: null,
          learningUnits: [
            {
              id: "u-2",
              title: "ArrayList vs LinkedList",
              description: "",
              orderIndex: 0,
              estimatedMinutes: 60,
              mastered: false,
              status: "IN_PROGRESS",
              masteredAt: null,
              unresolvedWeakTopic: true,
            },
          ],
        },
      ],
    },
  ],
};

const mockTimelineData: WeakTopicTimelineItem[] = [
  {
    weakTopicId: "wt-1",
    roadmapId: "roadmap-1",
    roadmapTitle: "Java Backend Roadmap",
    learningUnitId: "u-1",
    learningUnitTitle: "Tính Đa hình",
    topicId: "t-1",
    topicTitle: "OOP trong Java",
    milestoneId: "m-1",
    milestoneTitle: "Cột mốc 1: Java Core",
    status: "MASTERED",
    triggerSource: "QUIZ_FAILED",
    lastQuizScore: 40,
    lastUnderstandingRating: 2,
    unresolvedAt: "2026-03-01T10:00:00Z",
    masteredAt: "2026-03-05T15:00:00Z",
    daysToMaster: 4,
  },
  {
    weakTopicId: "wt-2",
    roadmapId: "roadmap-1",
    roadmapTitle: "Java Backend Roadmap",
    learningUnitId: "u-2",
    learningUnitTitle: "ArrayList vs LinkedList",
    topicId: "t-2",
    topicTitle: "Java Collections",
    milestoneId: "m-1",
    milestoneTitle: "Cột mốc 1: Java Core",
    status: "UNRESOLVED",
    triggerSource: "LOW_RATING",
    lastQuizScore: null,
    lastUnderstandingRating: 1,
    unresolvedAt: "2026-03-10T10:00:00Z",
    masteredAt: null,
    daysToMaster: null,
  },
];

describe("KnowledgeMapView", () => {
  it("renders mastery stats and topics with MASTERED badge", () => {
    render(<KnowledgeMapView data={mockMapData} />);

    // Mastery %
    expect(screen.getByText("66.7%")).not.toBeNull();
    // Milestone title
    expect(screen.getByText("Cột mốc 1: Java Core")).not.toBeNull();
    // Topic titles
    expect(screen.getByText("OOP trong Java")).not.toBeNull();
    expect(screen.getByText("Java Collections")).not.toBeNull();

    // Mastered badge on topic
    expect(screen.getAllByText("MASTERED").length).toBeGreaterThan(0);
  });

  it("filters topics by MASTERED status", () => {
    render(<KnowledgeMapView data={mockMapData} />);

    // Click filter "Đã làm chủ (1)"
    const masteredFilterBtn = screen.getByRole("button", { name: /Đã làm chủ/i });
    fireEvent.click(masteredFilterBtn);

    // OOP trong Java (mastered) should remain
    expect(screen.getByText("OOP trong Java")).not.toBeNull();
    // Java Collections (not mastered) should not be displayed
    expect(screen.queryByText("Java Collections")).toBeNull();
  });
});

describe("WeakTopicsTimelineView", () => {
  it("renders conquered topic timeline with days to master and dates", () => {
    render(<WeakTopicsTimelineView timeline={mockTimelineData} />);

    // Conquered count
    expect(screen.getByText("Đã vượt qua thành công")).not.toBeNull();
    expect(screen.getByText("Tính Đa hình")).not.toBeNull();
    expect(screen.getByText("Vượt qua sau 4 ngày nỗ lực")).not.toBeNull();

    // Unresolved item
    expect(screen.getByText("ArrayList vs LinkedList")).not.toBeNull();
    expect(screen.getByText("CẦN KHẮC PHỤC")).not.toBeNull();
  });
});
