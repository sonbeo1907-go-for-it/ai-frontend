"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CircleAlert,
  FileArchive,
  FileText,
  Files,
  Plus,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageLoading } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import type { Material, MaterialStatus, MaterialType, PageResponse } from "@/types/api";

export function MaterialsView() {
  const { show } = useToast();
  const [page, setPage] = useState<PageResponse<Material> | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "">("");
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "">("");
  const [open, setOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const parameters = new URLSearchParams({
        page: String(pageNumber),
        size: "12",
        sort: "createdAt,desc",
      });
      if (query) parameters.set("q", query);
      if (typeFilter) parameters.set("type", typeFilter);
      if (statusFilter) parameters.set("status", statusFilter);
      setPage(
        await apiRequest<PageResponse<Material>>(`/api/v1/materials?${parameters.toString()}`),
      );
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, query, show, statusFilter, typeFilter]);
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
    if (!page?.content.some((item) => item.status === "PENDING" || item.status === "PROCESSING"))
      return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [page, load]);
  async function archive() {
    if (!archiveTarget) return;
    try {
      await apiRequest<void>(`/api/v1/materials/${archiveTarget.id}`, { method: "DELETE" });
      show("Tài liệu đã được lưu trữ an toàn.");
      setArchiveTarget(null);
      await load();
    } catch (error) {
      show(getErrorMessage(error), "error");
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
              <h2 className="text-lg font-black">Tài liệu của bạn</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                PDF, DOCX, TXT dưới 20MB hoặc nội dung văn bản.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Thêm tài liệu
        </Button>
      </Card>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên tệp hoặc nội dung…"
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
      {(page?.content.length ?? 0) === 0 ? (
        <EmptyState
          icon={Files}
          title="Kho tài liệu đang trống"
          description="Tải lên giáo trình hoặc dán nội dung văn bản. Chỉ tài khoản của bạn có thể nhìn thấy những tài liệu này."
          action={
            <Button onClick={() => setOpen(true)}>
              <UploadCloud className="size-4" />
              Thêm tài liệu đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(page?.content ?? []).map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onArchive={() => setArchiveTarget(material)}
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
            Trang {page.number + 1}/{page.totalPages}
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
        description="Tài liệu sẽ biến mất khỏi danh sách nhưng vẫn được giữ cho các liên kết lộ trình hiện có."
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
    </div>
  );
}

function MaterialCard({ material, onArchive }: { material: Material; onArchive: () => void }) {
  const status = {
    PENDING: { label: "Chờ xử lý", tone: "amber" as const },
    PROCESSING: { label: "Đang trích xuất", tone: "indigo" as const },
    READY: { label: "Sẵn sàng", tone: "emerald" as const },
    FAILED: { label: "Xử lý thất bại", tone: "rose" as const },
  }[material.status];
  return (
    <Card className="group flex min-h-52 flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          {material.type === "FILE" ? (
            <FileArchive className="size-5" />
          ) : (
            <FileText className="size-5" />
          )}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <h3 className="mt-4 line-clamp-2 text-sm font-extrabold leading-5 text-slate-900">
        {material.originalFileName ||
          (material.type === "GOAL_DESCRIPTION" ? "Mô tả mục tiêu" : "Văn bản học tập")}
      </h3>
      <p className="mt-2 text-xs text-slate-500">
        {material.type === "FILE"
          ? `${formatBytes(material.fileSize)} · ${material.contentType || "Tệp tài liệu"}`
          : "Nội dung nhập trực tiếp"}
      </p>
      {material.status === "FAILED" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {material.errorMessage || material.errorCode || "Không thể trích xuất nội dung."}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-[11px] text-slate-400">{formatDate(material.createdAt)}</span>
        <button
          onClick={onArchive}
          className="focus-ring rounded-lg p-2 text-slate-400 opacity-70 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
          aria-label="Lưu trữ tài liệu"
        >
          <Archive className="size-4" />
        </button>
      </div>
    </Card>
  );
}

function CreateMaterialModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { show } = useToast();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<Exclude<MaterialType, "FILE">>("TEXT");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "file") {
        if (!file) throw new Error("Vui lòng chọn một tệp.");
        if (file.size >= 20 * 1024 * 1024) throw new Error("Dung lượng tệp phải nhỏ hơn 20MB.");
        if (!/\.(pdf|docx|txt)$/i.test(file.name))
          throw new Error("Chỉ hỗ trợ PDF, DOCX hoặc TXT.");
        const form = new FormData();
        form.append("file", file);
        await apiRequest<Material>("/api/v1/materials", { method: "POST", body: form });
      } else {
        await apiRequest<Material>("/api/v1/materials/text", {
          method: "POST",
          body: JSON.stringify({ type, content: content.trim() }),
        });
      }
      show(
        mode === "file"
          ? "Tệp đã được tải lên và đang chờ trích xuất."
          : "Nội dung đã được lưu vào kho tài liệu.",
      );
      setFile(null);
      setContent("");
      await onCreated();
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm tài liệu học tập"
      description="Tài liệu tải lên được xem là dữ liệu không đáng tin cậy, không phải chỉ dẫn cho AI."
      closeDisabled={loading}
      confirmClose={Boolean(file || content.trim())}
    >
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          aria-pressed={mode === "file"}
          onClick={() => setMode("file")}
          className={`rounded-lg py-2.5 text-sm font-bold ${mode === "file" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          Tải tệp
        </button>
        <button
          type="button"
          aria-pressed={mode === "text"}
          onClick={() => setMode("text")}
          className={`rounded-lg py-2.5 text-sm font-bold ${mode === "text" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          Dán văn bản
        </button>
      </div>
      <form onSubmit={submit} className="space-y-5">
        {mode === "file" ? (
          <Field
            label="Tệp PDF, DOCX hoặc TXT"
            hint="Dung lượng phải nhỏ hơn 20MB. Hệ thống sẽ kiểm tra định dạng thực tế của tệp."
          >
            <label className="focus-ring flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30">
              <UploadCloud className="size-8 text-indigo-600" />
              <span className="mt-3 text-sm font-extrabold text-slate-800">
                {file?.name || "Chọn tệp từ thiết bị"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                {file ? formatBytes(file.size) : "PDF · DOCX · TXT"}
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        ) : (
          <>
            <Field label="Loại nội dung">
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as Exclude<MaterialType, "FILE">)}
              >
                <option value="TEXT">Văn bản học tập</option>
                <option value="GOAL_DESCRIPTION">Mô tả mục tiêu</option>
              </Select>
            </Field>
            <Field label="Nội dung" hint={`${content.length}/50.000 ký tự · tối thiểu 50 ký tự`}>
              <Textarea
                rows={9}
                minLength={50}
                maxLength={50000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                placeholder="Dán giáo trình, ghi chú hoặc nội dung mục tiêu…"
              />
            </Field>
          </>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={mode === "file" ? !file : content.trim().length < 50}
          >
            Lưu tài liệu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
