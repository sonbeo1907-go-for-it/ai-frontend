import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminAiExecutionApi, ADMIN_AI_EXECUTIONS_PATH } from "@/lib/api-client";

describe("adminAiExecutionApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: url.includes("/exec-123")
                ? {
                    id: "exec-123",
                    providerId: "prov-1",
                    providerName: "OpenAI",
                    model: "gpt-4o",
                    purpose: "ROADMAP_GENERATION",
                    operation: "GENERATE",
                    status: "SUCCEEDED",
                    attemptCount: 1,
                    createdAt: "2026-09-30T10:00:00Z",
                    timeline: [],
                  }
                : {
                    content: [],
                    page: 0,
                    size: 20,
                    totalElements: 0,
                    totalPages: 1,
                    first: true,
                    last: true,
                  },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }),
    );
  });

  it("listExecutions calls GET /api/v1/admin/ai-executions without query when empty", async () => {
    await adminAiExecutionApi.listExecutions();
    expect(fetch).toHaveBeenCalledWith(
      ADMIN_AI_EXECUTIONS_PATH,
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("listExecutions encodes operational filter parameters correctly", async () => {
    await adminAiExecutionApi.listExecutions({
      status: "FAILED",
      purpose: "ROADMAP_GENERATION",
      operation: "GENERATE",
      failureCode: "AI_RATE_LIMIT",
      page: 2,
      size: 10,
      sort: "createdAt,desc",
    });

    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_AI_EXECUTIONS_PATH}?purpose=ROADMAP_GENERATION&operation=GENERATE&status=FAILED&failureCode=AI_RATE_LIMIT&page=2&size=10&sort=createdAt%2Cdesc`,
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("getExecutionDetail calls GET /api/v1/admin/ai-executions/:id", async () => {
    const res = await adminAiExecutionApi.getExecutionDetail("exec-123");
    expect(fetch).toHaveBeenCalledWith(
      `${ADMIN_AI_EXECUTIONS_PATH}/exec-123`,
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(res.id).toBe("exec-123");
  });
});
