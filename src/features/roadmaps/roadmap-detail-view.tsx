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
import { apiRequest, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { WeakTopicsPanel } from "@/features/evaluations/weak-topics-panel";
import {
  roadmapStatusLabels,
  versionOriginLabels,
  versionStatusLabels,
} from "@/lib/display-labels";
import type { Roadmap, RoadmapItem, RoadmapVersion } from "@/types/api";
import {
  RoadmapAiGenerationModal,
  type RoadmapAiGenerationInput,
} from "./roadmap-ai-generation-modal";
import { RoadmapAiExecutionStatus } from "./roadmap-ai-execution-status";
import { useRoadmapAiExecution } from "./use-roadmap-ai-execution";
import { itemTypeLabel, roadmapApi } from "./roadmap-api";
import {
  LearningUnitProgress,
  RoadmapProgressSummaryCard,
  TopicProgress,
} from "./roadmap-progress";

export function RoadmapDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"generate" | "regenerate" | null>(null);
  const [aiError, setAiError] = useState("");
  const [topicParent, setTopicParent] = useState<RoadmapItem | null>(null);
  const [learningUnitParent, setLearningUnitParent] = useState<RoadmapItem | null>(null);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
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
  const handleAiSucceeded = useCallback(
    async (resultId: string, execution: { operation: "GENERATE" | "REGENERATE" }) => {
      await load();
      setSelectedId(resultId);
      show(
        execution.operation === "REGENERATE"
          ? "AI đã tạo phiên bản DRAFT mới và giữ lại lịch sử cũ."
          : "AI đã tạo bản DRAFT của lộ trình.",
      );
    },
    [load, show],
  );
  const {
    execution: aiExecution,
    recovering: aiRecovering,
    submitting: aiSubmitting,
    pollingError: aiPollingError,
    active: aiActive,
    generate: generateWithAi,
    regenerate: regenerateWithAi,
    refreshStatus: refreshAiStatus,
    dismissFailure: dismissAiFailure,
  } = useRoadmapAiExecution(id, handleAiSucceeded);
  const version = useMemo(
    () => roadmap?.versions.find((item) => item.id === selectedId) ?? null,
    [roadmap, selectedId],
  );
  const aiBlockingMutations = aiRecovering || aiActive;
  const draftVersionSelected = version?.status === "DRAFT";
  const editable = draftVersionSelected && !aiBlockingMutations;
  const activationIssue = getActivationIssue(version);
  const complete = Boolean(version && !activationIssue);
  async function action(run: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await run();
      show(message);
      await load();
      return true;
    } catch (error) {
      show(getErrorMessage(error), "error");
      return false;
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
  async function updateMetadata(values: { title: string; description: string }) {
    if (!roadmap) return;
    try {
      const updated = await apiRequest<Roadmap>(`/api/v1/roadmaps/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          entityVersion: roadmap.entityVersion,
        }),
      });
      setRoadmap(updated);
      setMetadataOpen(false);
      show("Tên và mô tả lộ trình đã được cập nhật.");
    } catch (error) {
      if (isApiErrorCode(error, "ROADMAP_ALREADY_ACTIVATED")) {
        setMetadataOpen(false);
        setCopyOpen(true);
      }
      show(getErrorMessage(error), "error");
      await load();
    }
  }

  async function createEditableCopy() {
    setBusy(true);
    try {
      const copy = await roadmapApi.createEditableCopy(id);
      show("Đã tạo một lộ trình DRAFT mới để bạn chỉnh sửa.");
      router.push(`/roadmaps/${copy.id}`);
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setBusy(false);
      setCopyOpen(false);
    }
  }
  function openAiModal(mode: "generate" | "regenerate") {
    setAiError("");
    setAiMode(mode);
  }
  function closeAiModal() {
    if (aiSubmitting) return;
    setAiError("");
    setAiMode(null);
  }
  async function submitAi(input: RoadmapAiGenerationInput) {
    if (!aiMode) return;

    setAiError("");

    try {
      const generatingInitialVersion = aiMode === "generate";
      const acceptedExecution = generatingInitialVersion
        ? await generateWithAi(input.materialIds)
        : await regenerateWithAi(input.adjustmentPrompt);

      setAiMode(null);
      show(
        acceptedExecution.operation === "REGENERATE"
          ? "Yêu cầu tái tạo lộ trình đã được tiếp nhận."
          : "Yêu cầu sinh lộ trình đã được tiếp nhận.",
      );
    } catch (error) {
      setAiError(getErrorMessage(error));
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
    const removed = await action(
      () =>
        apiRequest<void>(`/api/v1/roadmaps/${id}/versions/${version.id}/items/${deleteTarget.id}`, {
          method: "DELETE",
        }),
      "Đã xóa nội dung khỏi bản DRAFT.",
    );
    if (removed) setDeleteTarget(null);
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
                  {roadmapStatusLabels[roadmap.status]}
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
              {roadmap.status === "DRAFT" && (
                <Button variant="secondary" onClick={() => setMetadataOpen(true)}>
                  <Edit3 className="size-4" />
                  Sửa thông tin
                </Button>
              )}
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
              {roadmap.status === "DRAFT" && !draftVersionSelected && !aiBlockingMutations && (
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
              {roadmap.status === "ACTIVE" && !aiBlockingMutations && (
                <Button variant="secondary" onClick={() => setCopyOpen(true)}>
                  <CopyPlus className="size-4" />
                  Tạo bản sao để chỉnh sửa
                </Button>
              )}
            </div>
          </div>
          <RoadmapProgressSummaryCard progress={roadmap.progress} />
          {editable && !complete && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              <strong>Chưa thể kích hoạt.</strong> {activationIssue}
            </div>
          )}
        </div>
      </Card>
      <RoadmapAiExecutionStatus
        execution={aiExecution}
        recovering={aiRecovering}
        pollingError={aiPollingError}
        onRefresh={refreshAiStatus}
        onDismiss={dismissAiFailure}
      />
      <WeakTopicsPanel roadmapId={id} roadmapVersionId={version?.id} />
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
                      {versionStatusLabels[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDate(item.createdAt)} · {versionOriginLabels[item.origin]}
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
              onAddLearningUnit={setLearningUnitParent}
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
                  <Button
                    variant="success"
                    onClick={() => openAiModal("generate")}
                    loading={aiBlockingMutations}
                    disabled={aiBlockingMutations}
                  >
                    <Sparkles className="size-4" />
                    Sinh bằng AI
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void createVersion()}
                    loading={busy}
                    disabled={aiBlockingMutations}
                  >
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
          busy={aiSubmitting}
          submissionError={aiError}
          onClose={closeAiModal}
          onSubmit={(input) => void submitAi(input)}
        />
      )}

      {metadataOpen && (
        <RoadmapMetadataModal
          open
          roadmap={roadmap}
          onClose={() => setMetadataOpen(false)}
          onSave={updateMetadata}
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
            const saved = await action(
              () =>
                apiRequest<RoadmapItem>(
                  `/api/v1/roadmaps/${id}/versions/${version.id}/milestones`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Đã thêm cột mốc.",
            );
            if (saved) setMilestoneOpen(false);
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
            const saved = await action(
              () =>
                apiRequest<RoadmapItem>(
                  `/api/v1/roadmaps/${id}/versions/${version.id}/milestones/${topicParent.id}/topics`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Đã thêm chủ đề.",
            );
            if (saved) setTopicParent(null);
          }}
        />
      )}
      {version && learningUnitParent && (
        <ItemModal
          open
          onClose={() => setLearningUnitParent(null)}
          title={`Thêm đơn vị học vào “${learningUnitParent.title}”`}
          itemType="LEARNING_UNIT"
          parentTitle={learningUnitParent.title}
          siblingTitles={learningUnitParent.learningUnits.map((item) => item.title)}
          nextOrder={learningUnitParent.learningUnits.length}
          onSave={async (values) => {
            const saved = await action(
              () => roadmapApi.createLearningUnit(id, version.id, learningUnitParent.id, values),
              "Đã thêm đơn vị học.",
            );
            if (saved) setLearningUnitParent(null);
          }}
        />
      )}
      {version && editTarget && (
        <ItemModal
          open
          onClose={() => setEditTarget(null)}
          title={`Chỉnh sửa ${itemTypeLabel(editTarget.itemType)}`}
          itemType={editTarget.itemType}
          parentTitle={
            editTarget.itemType === "LEARNING_UNIT"
              ? findParentTopic(version, editTarget)?.title
              : undefined
          }
          siblingTitles={
            editTarget.itemType === "LEARNING_UNIT"
              ? (findParentTopic(version, editTarget)
                  ?.learningUnits.filter((item) => item.id !== editTarget.id)
                  .map((item) => item.title) ?? [])
              : undefined
          }
          initial={editTarget}
          nextOrder={editTarget.orderIndex}
          onSave={async (values) => {
            const saved = await action(
              () => roadmapApi.updateItem(id, version.id, editTarget.id, values),
              "Nội dung và thứ tự đã được cập nhật.",
            );
            if (saved) setEditTarget(null);
          }}
        />
      )}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        closeDisabled={busy}
        title={`Xóa ${deleteTarget ? itemTypeLabel(deleteTarget.itemType) : "nội dung"}?`}
        description={
          deleteTarget?.itemType === "MILESTONE"
            ? "Các chủ đề và đơn vị học bên trong cột mốc cũng sẽ bị xóa khỏi bản DRAFT."
            : deleteTarget?.itemType === "TOPIC"
              ? "Các đơn vị học bên trong chủ đề cũng sẽ bị xóa khỏi bản DRAFT."
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
      <Modal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        closeDisabled={busy}
        title="Tạo bản sao để chỉnh sửa?"
        description="Lộ trình đã kích hoạt là bất biến. Hệ thống sẽ tạo một lộ trình mới với Version 1 ở trạng thái DRAFT; lộ trình hiện tại và lịch sử của nó không bị thay đổi."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCopyOpen(false)}>
            Hủy
          </Button>
          <Button loading={busy} onClick={() => void createEditableCopy()}>
            <CopyPlus className="size-4" />
            Tạo bản sao
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function RoadmapMetadataModal({
  open,
  roadmap,
  onClose,
  onSave,
}: {
  open: boolean;
  roadmap: Roadmap;
  onClose: () => void;
  onSave: (values: { title: string; description: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(roadmap.title ?? "");
  const [description, setDescription] = useState(roadmap.description ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  const changed =
    title.trim() !== (roadmap.title ?? "") || description.trim() !== (roadmap.description ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chỉnh sửa thông tin lộ trình"
      description="Tên và mô tả được dùng để phân biệt các mục tiêu học tập của bạn."
      closeDisabled={saving}
      confirmClose={changed}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên lộ trình">
          <Input
            autoFocus
            data-modal-initial-focus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="Mô tả" hint="Không bắt buộc · tối đa 4.000 ký tự">
          <Textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={!title.trim() || !changed}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VersionCanvas({
  version,
  editable,
  onAddTopic,
  onAddLearningUnit,
  onEdit,
  onDelete,
}: {
  version: RoadmapVersion;
  editable: boolean;
  onAddTopic: (item: RoadmapItem) => void;
  onAddLearningUnit: (item: RoadmapItem) => void;
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
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                      >
                        <div className="group flex items-start gap-3">
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
                            <TopicProgress progress={topic.progress} />
                          </div>
                          {editable && (
                            <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                              <button
                                onClick={() => onEdit(topic)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-indigo-600"
                                aria-label={`Chỉnh sửa chủ đề ${topic.title}`}
                              >
                                <Edit3 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => onDelete(topic)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Xóa chủ đề ${topic.title}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-4">
                          {topic.learningUnits.map((learningUnit) => (
                            <div
                              key={learningUnit.id}
                              className="group flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
                            >
                              <LearningUnitProgress item={learningUnit} />
                              {editable && (
                                <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                                  <button
                                    onClick={() => onEdit(learningUnit)}
                                    className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                    aria-label={`Chỉnh sửa đơn vị học ${learningUnit.title}`}
                                  >
                                    <Edit3 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDelete(learningUnit)}
                                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                    aria-label={`Xóa đơn vị học ${learningUnit.title}`}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {editable && (
                            <button
                              onClick={() => onAddLearningUnit(topic)}
                              className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:bg-white hover:text-indigo-700"
                            >
                              <Plus className="size-3.5" />
                              Thêm đơn vị học
                            </button>
                          )}
                        </div>
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
  parentTitle,
  siblingTitles = [],
  initial,
  nextOrder,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  itemType: "MILESTONE" | "TOPIC" | "LEARNING_UNIT";
  parentTitle?: string;
  siblingTitles?: string[];
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
  const normalizedName = name.trim().toLocaleLowerCase("vi");
  const learningUnitTitleError =
    itemType === "LEARNING_UNIT" && normalizedName
      ? normalizedName === parentTitle?.trim().toLocaleLowerCase("vi")
        ? "Đơn vị học phải là một hành động nhỏ và cụ thể hơn chủ đề cha."
        : siblingTitles.some((title) => title.trim().toLocaleLowerCase("vi") === normalizedName)
          ? "Tên đơn vị học không được trùng với đơn vị khác trong cùng chủ đề."
          : undefined
      : undefined;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title: name.trim(),
        description: description.trim(),
        orderIndex,
        ...(itemType !== "MILESTONE" ? { estimatedMinutes: minutes } : {}),
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeDisabled={loading}
      confirmClose={
        name !== (initial?.title ?? "") ||
        description !== (initial?.description ?? "") ||
        orderIndex !== (initial?.orderIndex ?? nextOrder) ||
        (itemType !== "MILESTONE" && minutes !== (initial?.estimatedMinutes ?? 60))
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Field
          label={itemType === "LEARNING_UNIT" ? "Tên đơn vị học" : "Tên"}
          hint={
            itemType === "LEARNING_UNIT"
              ? "Mô tả một kết quả học nhỏ có thể hoàn thành trong một nhiệm vụ."
              : undefined
          }
          error={learningUnitTitleError}
        >
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            placeholder={
              itemType === "LEARNING_UNIT"
                ? "Ví dụ: Giải thích Encapsulation và viết một ví dụ"
                : undefined
            }
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
          {itemType !== "MILESTONE" && (
            <Field label="Thời lượng dự kiến (phút)">
              <Input
                type="number"
                min={1}
                max={itemType === "LEARNING_UNIT" ? 1440 : 10080}
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
          <Button
            type="submit"
            loading={loading}
            disabled={!name.trim() || Boolean(learningUnitTitleError)}
          >
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

function findParentTopic(version: RoadmapVersion, item: RoadmapItem) {
  if (!item.parentItemId) return undefined;
  return version.milestones
    .flatMap((milestone) => milestone.topics)
    .find((topic) => topic.id === item.parentItemId);
}

function getActivationIssue(version: RoadmapVersion | null) {
  if (!version?.milestones.length) {
    return "Bản DRAFT cần ít nhất một cột mốc.";
  }

  for (const milestone of version.milestones) {
    if (!milestone.topics.length) {
      return `Cột mốc “${milestone.title}” cần ít nhất một chủ đề.`;
    }

    for (const topic of milestone.topics) {
      if (!topic.learningUnits.length) {
        return `Chủ đề “${topic.title}” cần ít nhất một đơn vị học.`;
      }

      const normalizedTopicTitle = topic.title.trim().toLocaleLowerCase();
      const normalizedUnitTitles = topic.learningUnits.map((unit) =>
        unit.title.trim().toLocaleLowerCase(),
      );
      if (normalizedUnitTitles.includes(normalizedTopicTitle)) {
        return `Đơn vị học trong chủ đề “${topic.title}” phải là hành động nhỏ, không được sao chép nguyên tên chủ đề.`;
      }
      if (new Set(normalizedUnitTitles).size !== normalizedUnitTitles.length) {
        return `Các đơn vị học trong chủ đề “${topic.title}” không được trùng tên.`;
      }
    }
  }

  return null;
}
