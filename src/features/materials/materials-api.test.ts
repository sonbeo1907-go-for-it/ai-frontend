import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveMaterial,
  createMaterialText,
  fetchMaterials,
  restoreMaterial,
  uploadMaterialFile,
} from "./materials-api";

describe("materials-api module", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { success: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("fetches active materials with correct query params", async () => {
    await fetchMaterials({
      page: 1,
      size: 10,
      sort: "createdAt,desc",
      query: "react",
      type: "FILE",
      status: "READY",
      archived: false,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials?page=1&size=10&sort=createdAt%2Cdesc&q=react&type=FILE&status=READY",
      expect.anything(),
    );
  });

  it("fetches archived materials with archived=true", async () => {
    await fetchMaterials({
      page: 0,
      size: 12,
      archived: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials?page=0&size=12&sort=createdAt%2Cdesc&archived=true",
      expect.anything(),
    );
  });

  it("uploads a file via multipart form data", async () => {
    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    await uploadMaterialFile(file);

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });

  it("creates text material with JSON payload", async () => {
    await createMaterialText({
      type: "TEXT",
      content: "Sample text content for learning",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials/text",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "TEXT",
          content: "Sample text content for learning",
        }),
      }),
    );
  });

  it("archives material via DELETE request", async () => {
    await archiveMaterial("mat-123");

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials/mat-123",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("restores material via POST restore request", async () => {
    await restoreMaterial("mat-123");

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/materials/mat-123/restore",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
