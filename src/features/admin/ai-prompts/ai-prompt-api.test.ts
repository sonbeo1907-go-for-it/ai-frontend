import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiPromptApi } from "@/lib/api-client";

describe("aiPromptApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: url.includes("preview")
                ? { renderedContent: "Rendered text", sampleData: {} }
                : { id: "p-1", versionNumber: 1, content: "test" },
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

  it("listByPurpose calls GET with purpose query parameter", async () => {
    await aiPromptApi.listByPurpose("ROADMAP_GENERATION");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts?purpose=ROADMAP_GENERATION",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("getById calls GET /api/v1/admin/ai-prompts/:id", async () => {
    await aiPromptApi.getById("prompt-123");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("createDraft calls POST /api/v1/admin/ai-prompts", async () => {
    await aiPromptApi.createDraft({
      purpose: "ROADMAP_GENERATION",
      content: "Hello {{language}}",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          purpose: "ROADMAP_GENERATION",
          content: "Hello {{language}}",
        }),
      }),
    );
  });

  it("updateDraft calls PUT /api/v1/admin/ai-prompts/:id", async () => {
    await aiPromptApi.updateDraft("prompt-123", {
      content: "Updated content",
      version: 2,
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          content: "Updated content",
          version: 2,
        }),
      }),
    );
  });

  it("publish calls POST /api/v1/admin/ai-prompts/:id/publish?version=:version", async () => {
    await aiPromptApi.publish("prompt-123", 2);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123/publish?version=2",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("activate calls POST /api/v1/admin/ai-prompts/:id/activate?version=:version", async () => {
    await aiPromptApi.activate("prompt-123", 3);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123/activate?version=3",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rollback calls POST /api/v1/admin/ai-prompts/:id/rollback?version=:version", async () => {
    await aiPromptApi.rollback("prompt-123", 1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123/rollback?version=1",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("archive calls DELETE /api/v1/admin/ai-prompts/:id?version=:version", async () => {
    await aiPromptApi.archive("prompt-123", 2);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/prompt-123?version=2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("preview calls POST /api/v1/admin/ai-prompts/preview", async () => {
    await aiPromptApi.preview({
      purpose: "ROADMAP_GENERATION",
      content: "Prompt text",
      syntheticData: { language: "vi-VN" },
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          purpose: "ROADMAP_GENERATION",
          content: "Prompt text",
          syntheticData: { language: "vi-VN" },
        }),
      }),
    );
  });

  it("getDefault calls GET /api/v1/admin/ai-prompts/default with purpose parameter", async () => {
    await aiPromptApi.getDefault("ROADMAP_GENERATION");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/ai-prompts/default?purpose=ROADMAP_GENERATION",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

