"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Files,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  UploadCloud,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageLoading } from "@/components/ui/states";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import type { Material, MaterialStatus, MaterialType, PageResponse } from "@/types/api";
import { CreateMaterialModal } from "./create-material-modal";
import { MaterialCard } from "./material-card";
import { archiveMaterial, fetchMaterials, restoreMaterial } from "./materials-api";

function isApiClientError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError ||
    (typeof error === "object" && error !== null && "details" in error)
  );
}

function getMaterialName(item: Material): string {
  return (
    item.originalFileName ||
    (item.type === "GOAL_DESCRIPTION" ? "Mô tả mục tiêu" : "Văn bản học tập")
  );
}

export function MaterialsView() {
  const { show } = useToast();
  const [viewMode, setViewMode] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [page, setPage] = useState<PageResponse<Material> | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "">("");
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "">("");
  const [open, setOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Material | null>(null);
  const [staleConflictTarget, setStaleConflictTarget] = useState<Material | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const result = await fetchMaterials({
        page: pageNumber,
        size: 12,
        sort: "createdAt,desc",
        query,
        type: typeFilter,
        status: statusFilter,
        archived: viewMode === "ARCHIVED",
      });
      setPage(result);
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, query, show, statusFilter, typeFilter, viewMode]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPageNumber(0);
      setQuery(search.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (viewMode === "ARCHIVED") return;
    if (!page?.content.some((item) => item.status === "PENDING" || item.status === "PROCESSING"))
      return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [page, load, viewMode]);

  async function archive() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    try {
      await archiveMaterial(target.id);
      const name = getMaterialName(target);
      show(`Tài liệu "${name}" đã được lưu trữ an toàn.`, {
        tone: "success",
        action: {
          label: "Xem trong mục Đã lưu trữ",
          onClick: () => {
            setViewMode("ARCHIVED");
            setPageNumber(0);
          },
        },
      });
      setArchiveTarget(null);
      await load();
    } catch (error) {
      show(getErrorMessage(error), "error");
    }
  }

  async function restore(material: Material) {
    setRestoringId(material.id);
    try {
      await restoreMaterial(material.id);
      const name = getMaterialName(material);
      show(`Đã khôi phục "${name}" thành công.`, {
        tone: "success",
        action: {
          label: "Xem ở mục Đang hoạt động",
          onClick: () => {
            setViewMode("ACTIVE");
            setPageNumber(0);
          },
        },
      });
      setStaleConflictTarget(null);
      await load();
    } catch (error) {
      if (isApiClientError(error)) {
        if (error.details.code === "MATERIAL_NOT_ARCHIVED") {
          show("Tài liệu đã ở trạng thái hoạt động.", "error");
          await load();
          return;
        }
        if (error.details.code === "STORAGE_OBJECT_MISSING") {
          show(
            "Không thể khôi phục tài liệu vì dữ liệu lưu trữ không còn khả dụng. Tài liệu vẫn được giữ trong mục Đã lưu trữ.",
            "error",
          );
          return;
        }
        if (error.details.code === "DEPENDENCY_INACTIVE") {
          show(
            "Không thể khôi phục do tài nguyên phụ thuộc đã bị vô hiệu hóa hoặc lưu trữ. Vui lòng khôi phục tài nguyên phụ thuộc trước.",
            "error",
          );
          return;
        }
        if (error.details.code === "CONCURRENT_MODIFICATION" || error.details.status === 409) {
          // Optimistic lock conflict: Reload latest snapshot, do NOT auto-retry.
          await load();
          setStaleConflictTarget(material);
          return;
        }
      }
      show(getErrorMessage(error), "error");
    } finally {
      setRestoringId(null);
    }
  }

  if (loading && !page) return <PageLoading label="Đang tải kho tài liệu…" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Files className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900">Kho tài liệu học tập</h1>
              <p className="text-xs text-slate-500">
                Tài liệu tải lên chỉ được sử dụng cho việc trích xuất kiến thức và tạo câu hỏi cho
                chính bạn.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Thêm tài liệu
        </Button>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode("ACTIVE");
              setPageNumber(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              viewMode === "ACTIVE"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Đang hoạt động
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("ARCHIVED");
              setPageNumber(0);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              viewMode === "ARCHIVED"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Đã lưu trữ
          </button>
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm tài liệu…"
              className="focus-ring h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Lọc loại tài liệu"
              value={typeFilter}
              onChange={(event) => {
                setPageNumber(0);
                setTypeFilter(event.target.value as MaterialType | "");
              }}
            >
              <option value="">Tất cả loại</option>
              <option value="FILE">Tệp tải lên</option>
              <option value="TEXT">Văn bản</option>
              <option value="GOAL_DESCRIPTION">Mục tiêu học tập</option>
            </Select>
            <Select
              aria-label="Lọc trạng thái tài liệu"
              value={statusFilter}
              onChange={(event) => {
                setPageNumber(0);
                setStatusFilter(event.target.value as MaterialStatus | "");
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="PROCESSING">Đang trích xuất</option>
              <option value="READY">Sẵn sàng</option>
              <option value="FAILED">Thất bại</option>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">
              {page?.totalElements ?? 0} tài liệu
            </span>
            <button
              onClick={() => void load()}
              className="focus-ring rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-indigo-600"
              aria-label="Làm mới"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {(page?.content.length ?? 0) === 0 ? (
        <EmptyState
          icon={viewMode === "ARCHIVED" ? Archive : Files}
          title={
            viewMode === "ARCHIVED"
              ? "Không có tài liệu nào trong mục Đã lưu trữ"
              : "Kho tài liệu đang trống"
          }
          description={
            viewMode === "ARCHIVED"
              ? "Các tài liệu đã lưu trữ sẽ xuất hiện tại đây khi bạn dọn dẹp kho tài liệu."
              : "Tải lên giáo trình hoặc dán nội dung văn bản. Chỉ tài khoản của bạn có thể nhìn thấy những tài liệu này."
          }
          action={
            viewMode === "ARCHIVED" ? null : (
              <Button onClick={() => setOpen(true)}>
                <UploadCloud className="size-4" />
                Thêm tài liệu đầu tiên
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(page?.content ?? []).map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isArchived={viewMode === "ARCHIVED"}
              onArchive={() => setArchiveTarget(material)}
              onRestore={() => void restore(material)}
              restoring={restoringId === material.id}
            />
          ))}
        </div>
      )}

      {page && page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page.first}
            onClick={() => setPageNumber((value) => value - 1)}
          >
            Trang trước
          </Button>
          <span className="text-xs font-bold text-slate-500">
            Trang {page.page + 1}/{page.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page.last}
            onClick={() => setPageNumber((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}

      <CreateMaterialModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          setPageNumber(0);
          await load();
        }}
      />

      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Lưu trữ tài liệu?"
        description="Tài liệu sẽ biến mất khỏi danh sách hoạt động nhưng vẫn được giữ cho các liên kết lộ trình hiện có."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setArchiveTarget(null)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={() => void archive()}>
            <Archive className="size-4" />
            Lưu trữ
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(staleConflictTarget)}
        onClose={() => setStaleConflictTarget(null)}
        title="Xác nhận khôi phục tài liệu"
        description="Thông tin tài nguyên đã thay đổi. Vui lòng kiểm tra lại và xác nhận khôi phục."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setStaleConflictTarget(null)}>
            Hủy
          </Button>
          <Button
            loading={Boolean(restoringId)}
            onClick={() => {
              if (staleConflictTarget) {
                void restore(staleConflictTarget);
              }
            }}
          >
            <RotateCcw className="size-4" />
            Xác nhận khôi phục
          </Button>
        </div>
      </Modal>
    </div>
  );
}
