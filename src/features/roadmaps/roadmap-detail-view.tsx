"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Clock3,
  CopyPlus,
  Edit3,
  Flag,
  Layers3,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageLoading } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Roadmap, RoadmapItem, RoadmapVersion } from "@/types/api";
import {
  RoadmapAiGenerationModal,
  type RoadmapAiGenerationInput,
} from "./roadmap-ai-generation-modal";

export function RoadmapDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"generate" | "regenerate" | null>(null);
  const [aiError, setAiError] = useState("");
  const [topicParent, setTopicParent] = useState<RoadmapItem | null>(null);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const data = await apiRequest<Roadmap>(`/api/v1/roadmaps/${id}`);
      setRoadmap(data);
      setSelectedId((current) =>
        current && data.versions.some((version) => version.id === current)
          ? current
          : (data.versions.find((version) => version.status === "DRAFT")?.id ??
            data.activeVersionId ??
            data.versions[0]?.id ??
            null),
      );
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [id, show]);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  const version = useMemo(
    () => roadmap?.versions.find((item) => item.id === selectedId) ?? null,
    [roadmap, selectedId],
  );
  const editable = version?.status === "DRAFT";
  const complete = Boolean(
    version?.milestones.length &&
    version.milestones.every((milestone) => milestone.topics.length > 0),
  );
  async function action(run: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await run();
      show(message);
      await load();
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  async function createVersion() {
    await action(
      async () => {
        const created = await apiRequest<RoadmapVersion>(`/api/v1/roadmaps/${id}/versions`, {
          method: "POST",
        });
        setSelectedId(created.id);
      },
      roadmap?.versions.length
        ? "Đã tạo bản DRAFT mới từ phiên bản đang hoạt động."
        : "Đã tạo phiên bản nội dung đầu tiên.",
    );
  }
  function openAiModal(mode: "generate" | "regenerate") {
    setAiError("");
    setAiMode(mode);
  }
  function closeAiModal() {
    if (busy) return;
    setAiError("");
    setAiMode(null);
  }
  async function submitAi(input: RoadmapAiGenerationInput) {
    if (!aiMode) return;

    setBusy(true);
    setAiError("");

    try {
      const generatingInitialVersion = aiMode === "generate";
      const path = generatingInitialVersion
        ? `/api/v1/roadmaps/${id}/generate-ai`
        : `/api/v1/roadmaps/${id}/regenerate-ai`;
      const body = generatingInitialVersion
        ? { materialIds: input.materialIds }
        : { adjustmentPrompt: input.adjustmentPrompt };
      const created = await apiRequest<RoadmapVersion>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSelectedId(created.id);
      setAiMode(null);
      show(
        generatingInitialVersion
          ? `AI đã tạo Version ${created.versionNumber} ở trạng thái DRAFT.`
          : `AI đã tái tạo Version ${created.versionNumber} và giữ lại lịch sử cũ.`,
      );
      await load();
    } catch (error) {
      setAiError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function activate() {
    if (!version) return;
    await action(
      () =>
        apiRequest<RoadmapVersion>(`/api/v1/roadmaps/${id}/versions/${version.id}/activate`, {
          method: "POST",
        }),
      "Phiên bản đã được kích hoạt. Bản ACTIVE trước đó vẫn được lưu trong lịch sử.",
    );
  }
  async function removeItem() {
    if (!version || !deleteTarget) return;
    await action(
      () =>
        apiRequest<void>(`/api/v1/roadmaps/${id}/versions/${version.id}/items/${deleteTarget.id}`, {
          method: "DELETE",
        }),
      "Đã xóa nội dung khỏi bản DRAFT.",
    );
    setDeleteTarget(null);
  }
  if (loading && !roadmap) return <PageLoading label="Đang mở lộ trình…" />;
  if (!roadmap)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        Không thể tải lộ trình.
      </div>
    );
  return (
    <div className="space-y-6 animate-fade-up">
      <button
        onClick={() => router.push("/roadmaps")}
        className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700"
      >
        <ArrowLeft className="size-4" />
        Tất cả lộ trình
      </button>
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={roadmap.status === "ACTIVE" ? "emerald" : "indigo"}>
                  {roadmap.status}
                </Badge>
                <span className="text-xs text-slate-400">
                  Cập nhật {formatDate(roadmap.updatedAt)}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {roadmap.title || "Lộ trình từ khảo sát"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {roadmap.description ||
                  "Tạo phiên bản nội dung, sau đó thêm cột mốc và chủ đề cho mục tiêu đã khảo sát."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && (
                <Button variant="secondary" onClick={() => openAiModal("regenerate")}>
                  <Sparkles className="size-4 text-indigo-600" />
                  Tái tạo bằng AI
                </Button>
              )}
              {editable && (
                <Button variant="secondary" onClick={() => setMilestoneOpen(true)}>
                  <Plus className="size-4" />
                  Cột mốc
                </Button>
              )}
              {editable && (
                <Button
                  variant="success"
                  disabled={!complete}
                  loading={busy}
                  onClick={() => void activate()}
                >
                  <CheckCircle2 className="size-4" />
                  Kích hoạt
                </Button>
              )}
              {!editable && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="success"
                    onClick={() => openAiModal(roadmap.versions.length ? "regenerate" : "generate")}
                    loading={busy}
                  >
                    <Sparkles className="size-4" />
                    {roadmap.versions.length ? "Tái tạo bằng AI" : "Sinh bằng AI"}
                  </Button>
                  <Button variant="secondary" onClick={() => void createVersion()} loading={busy}>
                    <CopyPlus className="size-4" />
                    {roadmap.versions.length ? "Tạo bản chỉnh sửa" : "Tạo thủ công"}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {editable && !complete && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <strong>Chưa thể kích hoạt.</strong> Bản DRAFT cần ít nhất một cột mốc và mỗi cột mốc
              cần ít nhất một chủ đề.
            </div>
          )}
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[17rem_1fr]">
        <Card className="h-fit p-4">
          <div className="flex items-center gap-2 px-2 py-1">
            <Layers3 className="size-4 text-indigo-600" />
            <h3 className="text-sm font-black">Lịch sử phiên bản</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {roadmap.versions.length ? (
              roadmap.versions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`focus-ring rounded-xl border p-3 text-left transition ${selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold">Version {item.versionNumber}</span>
                    <Badge
                      tone={
                        item.status === "ACTIVE"
                          ? "emerald"
                          : item.status === "DRAFT"
                            ? "indigo"
                            : "slate"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDate(item.createdAt)} · {item.origin}
                  </p>
                </button>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                Chưa có phiên bản nội dung. Hãy sinh bằng AI hoặc tạo Version 1 thủ công để bắt đầu.
              </p>
            )}
          </div>
        </Card>
        <div>
          {version ? (
            <VersionCanvas
              version={version}
              editable={editable}
              onAddTopic={setTopicParent}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ) : (
            <Card className="grid min-h-72 place-items-center border-dashed p-8 text-center">
              <div>
                <CirclePlus className="mx-auto size-10 text-indigo-400" />
                <h3 className="mt-4 font-black">Bắt đầu cấu trúc lộ trình</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Dùng AI để tự động phân rã mục tiêu hoặc tạo phiên bản thủ công.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button variant="success" onClick={() => openAiModal("generate")} loading={busy}>
                    <Sparkles className="size-4" />
                    Sinh bằng AI
                  </Button>
                  <Button variant="secondary" onClick={() => void createVersion()} loading={busy}>
                    Tạo Version 1 thủ công
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {aiMode && (
        <RoadmapAiGenerationModal
          mode={aiMode}
          busy={busy}
          submissionError={aiError}
          onClose={closeAiModal}
          onSubmit={(input) => void submitAi(input)}
        />
      )}

      {version && (
        <ItemModal
          open={milestoneOpen}
          onClose={() => setMilestoneOpen(false)}
          title="Thêm cột mốc"
          itemType="MILESTONE"
          nextOrder={version.milestones.length}
          onSave={async (values) => {
            await action(
              () =>
                apiRequest<RoadmapItem>(
                  `/api/v1/roadmaps/${id}/versions/${version.id}/milestones`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Đã thêm cột mốc.",
            );
            setMilestoneOpen(false);
          }}
        />
      )}
      {version && topicParent && (
        <ItemModal
          open
          onClose={() => setTopicParent(null)}
          title={`Thêm chủ đề vào “${topicParent.title}”`}
          itemType="TOPIC"
          nextOrder={topicParent.topics.length}
          onSave={async (values) => {
            await action(
              () =>
                apiRequest<RoadmapItem>(
                  `/api/v1/roadmaps/${id}/versions/${version.id}/milestones/${topicParent.id}/topics`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Đã thêm chủ đề.",
            );
            setTopicParent(null);
          }}
        />
      )}
      {version && editTarget && (
        <ItemModal
          open
          onClose={() => setEditTarget(null)}
          title={`Chỉnh sửa ${editTarget.itemType === "MILESTONE" ? "cột mốc" : "chủ đề"}`}
          itemType={editTarget.itemType}
          initial={editTarget}
          nextOrder={editTarget.orderIndex}
          onSave={async (values) => {
            await action(
              () =>
                apiRequest<RoadmapItem>(
                  `/api/v1/roadmaps/${id}/versions/${version.id}/items/${editTarget.id}`,
                  { method: "PATCH", body: JSON.stringify(values) },
                ),
              "Nội dung và thứ tự đã được cập nhật.",
            );
            setEditTarget(null);
          }}
        />
      )}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Xóa ${deleteTarget?.itemType === "MILESTONE" ? "cột mốc" : "chủ đề"}?`}
        description={
          deleteTarget?.itemType === "MILESTONE"
            ? "Các chủ đề bên trong cột mốc cũng sẽ bị xóa khỏi bản DRAFT."
            : "Thao tác chỉ áp dụng cho bản DRAFT đang chỉnh sửa."
        }
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void removeItem()}>
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function VersionCanvas({
  version,
  editable,
  onAddTopic,
  onEdit,
  onDelete,
}: {
  version: RoadmapVersion;
  editable: boolean;
  onAddTopic: (item: RoadmapItem) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (item: RoadmapItem) => void;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      {version.milestones.length === 0 ? (
        <Card className="grid min-h-72 place-items-center border-dashed p-8 text-center">
          <div>
            <Flag className="mx-auto size-10 text-slate-300" />
            <h3 className="mt-4 font-black">Bản DRAFT chưa có cột mốc</h3>
            <p className="mt-1 text-sm text-slate-500">
              Dùng nút “Cột mốc” phía trên để tạo giai đoạn đầu tiên.
            </p>
          </div>
        </Card>
      ) : (
        version.milestones.map((milestone, index) => (
          <Card key={milestone.id} className="overflow-hidden">
            <div className="flex items-start gap-4 p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-sm font-black text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() =>
                    setClosed((value) => ({ ...value, [milestone.id]: !value[milestone.id] }))
                  }
                >
                  <span>
                    <span className="block text-base font-black text-slate-950">
                      {milestone.title}
                    </span>
                    {milestone.description && (
                      <span className="mt-1 block text-sm leading-5 text-slate-500">
                        {milestone.description}
                      </span>
                    )}
                  </span>
                  {closed[milestone.id] ? (
                    <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-1 size-4 shrink-0 text-slate-400" />
                  )}
                </button>
                {!closed[milestone.id] && (
                  <div className="mt-4 space-y-2 border-l-2 border-indigo-100 pl-4">
                    {milestone.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                      >
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-indigo-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold text-slate-900">{topic.title}</p>
                          {topic.description && (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {topic.description}
                            </p>
                          )}
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Clock3 className="size-3" />
                            {topic.estimatedMinutes ?? 0} phút · thứ tự {topic.orderIndex}
                          </span>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                            <button
                              onClick={() => onEdit(topic)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-indigo-600"
                              aria-label="Chỉnh sửa"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(topic)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Xóa"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <button
                        onClick={() => onAddTopic(milestone)}
                        className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Plus className="size-3.5" />
                        Thêm chủ đề
                      </button>
                    )}
                  </div>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onEdit(milestone)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                  >
                    <Edit3 className="size-4" />
                  </button>
                  <button
                    onClick={() => onDelete(milestone)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ItemModal({
  open,
  onClose,
  title,
  itemType,
  initial,
  nextOrder,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  itemType: "MILESTONE" | "TOPIC";
  initial?: RoadmapItem;
  nextOrder: number;
  onSave: (values: {
    title: string;
    description: string;
    orderIndex: number;
    estimatedMinutes?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [orderIndex, setOrderIndex] = useState(initial?.orderIndex ?? nextOrder);
  const [minutes, setMinutes] = useState(initial?.estimatedMinutes ?? 60);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title: name.trim(),
        description: description.trim(),
        orderIndex,
        ...(itemType === "TOPIC" ? { estimatedMinutes: minutes } : {}),
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="Mô tả">
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thứ tự">
            <Input
              type="number"
              min={0}
              value={orderIndex}
              onChange={(event) => setOrderIndex(Number(event.target.value))}
              required
            />
          </Field>
          {itemType === "TOPIC" && (
            <Field label="Thời lượng dự kiến (phút)">
              <Input
                type="number"
                min={1}
                max={10080}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                required
              />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading} disabled={!name.trim()}>
            {initial ? (
              "Lưu thay đổi"
            ) : (
              <>
                <CirclePlus className="size-4" />
                Thêm
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
