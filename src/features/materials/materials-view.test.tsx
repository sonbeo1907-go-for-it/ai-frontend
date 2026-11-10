import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/providers/toast-provider";
import type { Material, PageResponse } from "@/types/api";
import { MaterialsView } from "./materials-view";

const activeMaterial: Material = {
  id: "mat-1",
  type: "TEXT",
  status: "READY",
  originalFileName: "Active Note",
  createdAt: "2026-09-01T10:00:00Z",
};

const archivedMaterial: Material = {
  id: "mat-2",
  type: "FILE",
  status: "READY",
  originalFileName: "archived-doc.pdf",
  fileSize: 1024,
  contentType: "application/pdf",
  createdAt: "2026-08-01T10:00:00Z",
  archivedAt: "2026-09-15T12:00:00Z",
};

function createPageResponse(content: Material[]): PageResponse<Material> {
  return {
    content,
    page: 0,
    totalElements: content.length,
    totalPages: 1,
    size: 12,
    first: true,
    last: true,
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MaterialsView - US-ARC-01 Archive & Restore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active materials by default and switches to archived view on tab click", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("archived=true")) {
        return jsonResponse({ data: createPageResponse([archivedMaterial]) });
      }
      return jsonResponse({ data: createPageResponse([activeMaterial]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ToastProvider>
        <MaterialsView />
      </ToastProvider>,
    );

    // Initial load: active materials
    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });

    // Switch to Archived tab
    const archivedTab = screen.getByRole("button", { name: "Đã lưu trữ" });
    fireEvent.click(archivedTab);

    // Should fetch with archived=true and show archived-doc.pdf with restore button
    await waitFor(() => {
      expect(screen.getByText("archived-doc.pdf")).toBeTruthy();
      expect(screen.getByText(/Đã lưu trữ:/)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Khôi phục tài liệu" })).toBeTruthy();
    });
  });

  it("restores an archived material successfully", async () => {
    let restored = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith("/api/v1/materials/mat-2/restore")) {
        restored = true;
        return jsonResponse({ data: { ...archivedMaterial, archivedAt: undefined } });
      }
      if (url.includes("archived=true")) {
        return jsonResponse({
          data: createPageResponse(restored ? [] : [archivedMaterial]),
        });
      }
      return jsonResponse({ data: createPageResponse([activeMaterial]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ToastProvider>
        <MaterialsView />
      </ToastProvider>,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });

    // Switch to Archived tab
    fireEvent.click(screen.getByRole("button", { name: "Đã lưu trữ" }));

    // Wait for archived doc to appear
    await waitFor(() => {
      expect(screen.getByText("archived-doc.pdf")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Khôi phục tài liệu" })).toBeTruthy();
    });

    // Click Restore
    fireEvent.click(screen.getByRole("button", { name: "Khôi phục tài liệu" }));

    await waitFor(() => {
      expect(restored).toBe(true);
      expect(screen.getByText("Không có tài liệu nào trong mục Đã lưu trữ")).toBeTruthy();
      expect(screen.getByText(/Đã khôi phục "archived-doc\.pdf" thành công\./)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Xem ở mục Đang hoạt động/i })).toBeTruthy();
    });

    // Clicking toast action button should switch to Active tab
    fireEvent.click(screen.getByRole("button", { name: /Xem ở mục Đang hoạt động/i }));
    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });
  });

  it("handles optimistic lock 409 conflict: does NOT auto retry, reloads snapshot, prompts user to confirm", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith("/api/v1/materials/mat-2/restore")) {
        callCount++;
        if (callCount === 1) {
          // First attempt: optimistic conflict
          return jsonResponse(
            {
              status: 409,
              code: "CONCURRENT_MODIFICATION",
              message: "The resource was modified by another request. Reload it and try again.",
            },
            409,
          );
        }
        // Second attempt after user confirmation: success
        return jsonResponse({ data: { ...archivedMaterial, archivedAt: undefined } });
      }
      if (url.includes("archived=true")) {
        return jsonResponse({ data: createPageResponse([archivedMaterial]) });
      }
      return jsonResponse({ data: createPageResponse([activeMaterial]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ToastProvider>
        <MaterialsView />
      </ToastProvider>,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });

    // Switch to Archived
    fireEvent.click(screen.getByRole("button", { name: "Đã lưu trữ" }));

    await waitFor(() => {
      expect(screen.getByText("archived-doc.pdf")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Khôi phục tài liệu" })).toBeTruthy();
    });

    // Click Restore -> triggers 409
    fireEvent.click(screen.getByRole("button", { name: "Khôi phục tài liệu" }));

    // Must show conflict modal and NOT auto retry (callCount should still be 1)
    await waitFor(() => {
      expect(screen.getByText("Xác nhận khôi phục tài liệu")).toBeTruthy();
      expect(
        screen.getByText("Thông tin tài nguyên đã thay đổi. Vui lòng kiểm tra lại và xác nhận khôi phục."),
      ).toBeTruthy();
      expect(callCount).toBe(1);
    });

    // User confirms in the modal
    const confirmButton = screen.getByRole("button", { name: "Xác nhận khôi phục" });
    fireEvent.click(confirmButton);

    // Second call sent
    await waitFor(() => {
      expect(callCount).toBe(2);
    });
  });

  it("displays error toast on STORAGE_OBJECT_MISSING", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith("/api/v1/materials/mat-2/restore")) {
        return jsonResponse(
          {
            status: 404,
            code: "STORAGE_OBJECT_MISSING",
            message: "Physical storage file is missing.",
          },
          404,
        );
      }
      if (url.includes("archived=true")) {
        return jsonResponse({ data: createPageResponse([archivedMaterial]) });
      }
      return jsonResponse({ data: createPageResponse([activeMaterial]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ToastProvider>
        <MaterialsView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Đã lưu trữ" }));

    await waitFor(() => {
      expect(screen.getByText("archived-doc.pdf")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Khôi phục tài liệu" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục tài liệu" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Không thể khôi phục tài liệu vì dữ liệu lưu trữ không còn khả dụng. Tài liệu vẫn được giữ trong mục Đã lưu trữ.",
        ),
      ).toBeTruthy();
    });
  });

  it("displays error toast on MATERIAL_NOT_ARCHIVED and reloads list", async () => {
    let reloaded = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST" && url.endsWith("/api/v1/materials/mat-2/restore")) {
        return jsonResponse(
          {
            status: 409,
            code: "MATERIAL_NOT_ARCHIVED",
            message: "Material is not archived.",
          },
          409,
        );
      }
      if (url.includes("archived=true")) {
        reloaded = true;
        return jsonResponse({ data: createPageResponse([archivedMaterial]) });
      }
      return jsonResponse({ data: createPageResponse([activeMaterial]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ToastProvider>
        <MaterialsView />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Active Note")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Đã lưu trữ" }));

    await waitFor(() => {
      expect(screen.getByText("archived-doc.pdf")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Khôi phục tài liệu" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục tài liệu" }));

    await waitFor(() => {
      expect(screen.getByText("Tài liệu đã ở trạng thái hoạt động.")).toBeTruthy();
      expect(reloaded).toBe(true);
    });
  });
});
