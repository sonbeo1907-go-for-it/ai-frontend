"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, Layers3, Plus, Route, Search } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageLoading } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { roadmapStatusLabels } from "@/lib/display-labels";
import { formatDate } from "@/lib/format";
import type { PageResponse, Roadmap, RoadmapSummary } from "@/types/api";

export function RoadmapsView() {
  const { show } = useToast();
  const [page, setPage] = useState<PageResponse<RoadmapSummary> | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const parameters = new URLSearchParams({
        page: String(pageNumber),
        size: "12",
        sort: "updatedAt,desc",
      });
      if (query) parameters.set("q", query);
      setPage(
        await apiRequest<PageResponse<RoadmapSummary>>(`/api/v1/roadmaps?${parameters.toString()}`),
      );
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, query, show]);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  if (loading) return <PageLoading label="Đang tải các lộ trình…" />;
  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -right-12 -top-16 size-52 rounded-full bg-indigo-50" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Route className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Mỗi mục tiêu, một lộ trình riêng
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Tạo thủ công hoặc bắt đầu bằng khảo sát mục tiêu. Nội dung ACTIVE không bị ghi đè
                khi bạn chỉnh sửa.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/onboarding/roadmap">
              <Button variant="secondary">
                <CalendarClock className="size-4" />
                Khảo sát lộ trình
              </Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Tạo thủ công
            </Button>
          </div>
        </div>
      </Card>
      <form
        className="flex max-w-lg gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPageNumber(0);
          setQuery(searchInput.trim());
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên hoặc mô tả lộ trình…"
            className="focus-ring h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary">
          Tìm kiếm
        </Button>
      </form>
      {(page?.content.length ?? 0) === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={query ? "Không tìm thấy lộ trình phù hợp" : "Bạn chưa có lộ trình"}
          description={
            query
              ? "Hãy thử một từ khóa khác hoặc xóa nội dung tìm kiếm."
              : "Tạo lộ trình thủ công hoặc hoàn thành khảo sát cho một mục tiêu cụ thể."
          }
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Tạo lộ trình đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(page?.content ?? []).map((roadmap, index) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} index={index} />
          ))}
        </div>
      )}
      {page && page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page.first}
            onClick={() => setPageNumber((current) => current - 1)}
          >
            Trang trước
          </Button>
          <span className="text-xs font-bold text-slate-500">
            Trang {page.number + 1}/{page.totalPages} · {page.totalElements} lộ trình
          </span>
          <Button
            variant="secondary"
            disabled={page.last}
            onClick={() => setPageNumber((current) => current + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
      <CreateRoadmapModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await load();
        }}
      />
    </div>
  );
}
function RoadmapCard({ roadmap, index }: { roadmap: RoadmapSummary; index: number }) {
  const colors = [
    "from-indigo-600 to-blue-600",
    "from-emerald-600 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-600 to-pink-600",
  ];
  const statusTone =
    roadmap.status === "ACTIVE" ? "emerald" : roadmap.status === "ONBOARDING" ? "amber" : "indigo";
  return (
    <Link href={`/roadmaps/${roadmap.id}`} className="group">
      <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
        <div className={`h-2 bg-gradient-to-r ${colors[index % colors.length]}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              <BookOpen className="size-5" />
            </span>
            <Badge tone={statusTone}>{roadmapStatusLabels[roadmap.status]}</Badge>
          </div>
          <h3 className="mt-4 line-clamp-2 text-base font-black leading-6 text-slate-950">
            {roadmap.title || "Lộ trình từ khảo sát"}
          </h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
            {roadmap.description || "Hoàn thiện cấu trúc cột mốc và chủ đề cho mục tiêu này."}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
            <div>
              <span className="block text-slate-400">Phiên bản</span>
              <strong className="mt-0.5 block text-slate-800">
                {roadmap.versionCount || "Chưa có"}
              </strong>
            </div>
            <div>
              <span className="block text-slate-400">Đang chỉnh sửa</span>
              <strong className="mt-0.5 block text-slate-800">
                {roadmap.latestVersionNumber
                  ? `${roadmap.status === "ACTIVE" ? "ACTIVE " : ""}v${roadmap.latestVersionNumber}`
                  : "—"}
              </strong>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-[11px] text-slate-400">
              Cập nhật {formatDate(roadmap.updatedAt)}
            </span>
            <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
function CreateRoadmapModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiRequest<Roadmap>("/api/v1/roadmaps", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      setTitle("");
      setDescription("");
      show("Đã tạo lộ trình và phiên bản DRAFT đầu tiên.");
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
      title="Tạo lộ trình thủ công"
      description="Phiên bản đầu tiên bắt đầu ở DRAFT để bạn tự do xây dựng trước khi kích hoạt."
      closeDisabled={loading}
      confirmClose={Boolean(title.trim() || description.trim())}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên lộ trình">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="Ví dụ: Backend với Java Spring Boot"
            required
          />
        </Field>
        <Field label="Mô tả" hint="Không bắt buộc · tối đa 4.000 ký tự">
          <Textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            placeholder="Kết quả và phạm vi bạn muốn đạt được…"
          />
        </Field>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <Layers3 className="mt-0.5 size-5 text-indigo-600" />
            <p className="text-xs leading-5 text-indigo-900">
              <strong>Version 1 · DRAFT</strong>
              <br />
              Sau khi tạo, hãy thêm ít nhất một cột mốc và một chủ đề trước khi kích hoạt.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading} disabled={!title.trim()}>
            Tạo bản thảo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
