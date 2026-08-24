"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  CopyPlus,
  ListChecks,
  MoreHorizontal,
  Plus,
  SkipForward,
  Timer,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageLoading, ProgressBar } from "@/components/ui/states";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type {
  DailyPlan,
  DailyPlanItem,
  DailyPlanVersion,
  DailyTaskCategory,
  ProgressEntryStatus,
} from "@/types/api";
import { PomodoroModal } from "./pomodoro-modal";

export function DailyPlanDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [versions, setVersions] = useState<DailyPlanVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState<DailyPlanItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyPlanItem | null>(null);
  const [pomodoro, setPomodoro] = useState<{ open: boolean; taskId?: string }>({ open: false });
  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [nextPlan, nextVersions] = await Promise.all([
        apiRequest<DailyPlan>(`/api/v1/daily-plans/${id}`),
        apiRequest<DailyPlanVersion[]>(`/api/v1/daily-plans/${id}/versions`),
      ]);
      setPlan(nextPlan);
      setVersions(nextVersions);
      setSelectedId((current) =>
        current && nextVersions.some((item) => item.id === current)
          ? current
          : (nextVersions.find((item) => item.status === "DRAFT")?.id ??
            nextPlan.activeVersionId ??
            nextVersions[0]?.id ??
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
    () => versions.find((item) => item.id === selectedId) ?? null,
    [versions, selectedId],
  );
  const editable = version?.status === "DRAFT";
  const executable =
    version?.status === "ACTIVE" && plan && ["READY", "IN_PROGRESS"].includes(plan.status);
  const items = version?.items ?? [];
  const earned = items.reduce(
    (sum, item) =>
      sum + (item.status === "COMPLETED" ? 100 : item.status === "PARTIALLY_COMPLETED" ? 50 : 0),
    0,
  );
  const completion = items.length ? Math.round((earned / items.length) * 10) / 10 : 0;
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
  async function createDraft() {
    await action(async () => {
      const created = await apiRequest<DailyPlanVersion>(`/api/v1/daily-plans/${id}/versions`, {
        method: "POST",
      });
      setSelectedId(created.id);
    }, "Đã tạo phiên bản DRAFT mới; phiên bản ACTIVE chưa bị thay đổi.");
  }
  async function activate() {
    if (!version) return;
    await action(
      () =>
        apiRequest<DailyPlan>(`/api/v1/daily-plans/${id}/versions/${version.id}/activate`, {
          method: "POST",
        }),
      "Kế hoạch đã được kích hoạt và sẵn sàng thực hiện.",
    );
  }
  async function remove() {
    if (!version || !deleteTarget) return;
    await action(
      () =>
        apiRequest<DailyPlanVersion>(
          `/api/v1/daily-plans/${id}/versions/${version.id}/items/${deleteTarget.id}`,
          { method: "DELETE" },
        ),
      "Nhiệm vụ đã được xóa khỏi bản DRAFT.",
    );
    setDeleteTarget(null);
  }
  const recordPomodoro = useCallback(
    async (taskId: string, minutes: number) => {
      try {
        await apiRequest<DailyPlanItem>(`/api/v1/daily-plans/${id}/items/${taskId}/pomodoro`, {
          method: "POST",
          body: JSON.stringify({ completedMinutes: minutes }),
        });
        show(`Đã ghi nhận ${minutes} phút Pomodoro.`);
        await load();
      } catch (error) {
        show(getErrorMessage(error), "error");
      }
    },
    [id, load, show],
  );
  if (loading && !plan) return <PageLoading label="Đang mở kế hoạch ngày…" />;
  if (!plan)
    return (
      <div className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        Không thể tải kế hoạch.
      </div>
    );
  return (
    <div className="space-y-6 animate-fade-up">
      <button
        onClick={() => router.push("/daily-plans")}
        className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700"
      >
        <ArrowLeft className="size-4" />
        Lịch sử kế hoạch
      </button>
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  tone={
                    plan.status === "IN_PROGRESS"
                      ? "indigo"
                      : plan.status === "COMPLETED"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {plan.status}
                </Badge>
                <Badge>{plan.timeZoneSnapshot}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                {formatDate(`${plan.planDate}T00:00:00`, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quỹ thời gian {version?.availableMinutes ?? plan.availableMinutes} phút · tổng dự
                kiến {version?.totalPlannedMinutes ?? 0} phút
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editable && (
                <Button variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" />
                  Thêm nhiệm vụ
                </Button>
              )}
              {editable && (
                <Button
                  variant="success"
                  onClick={() => void activate()}
                  loading={busy}
                  disabled={items.length === 0}
                >
                  <CheckCircle2 className="size-4" />
                  Kích hoạt
                </Button>
              )}
              {!editable && (
                <Button onClick={() => void createDraft()} loading={busy}>
                  <CopyPlus className="size-4" />
                  Tạo bản chỉnh sửa
                </Button>
              )}
              {executable && (
                <Button variant="danger" onClick={() => setPomodoro({ open: true })}>
                  <Timer className="size-4" />
                  Pomodoro
                </Button>
              )}
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Metric label="Tiến độ" value={`${completion}%`}>
              <ProgressBar value={completion} />
            </Metric>
            <Metric
              label="Nhiệm vụ"
              value={`${items.filter((item) => item.status === "COMPLETED").length}/${items.length}`}
            />
            <Metric
              label="Thời lượng dự kiến"
              value={`${version?.totalPlannedMinutes ?? 0} phút`}
            />
          </div>
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[17rem_1fr]">
        <Card className="h-fit p-4">
          <h3 className="px-2 py-1 text-sm font-black">Phiên bản kế hoạch</h3>
          <div className="mt-3 grid gap-2">
            {versions.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`focus-ring rounded-xl border p-3 text-left ${selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm">Version {item.versionNumber}</strong>
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
                  {item.items.length} nhiệm vụ · {item.totalPlannedMinutes} phút
                </p>
              </button>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          {items.length === 0 ? (
            <Card className="grid min-h-72 place-items-center border-dashed p-8 text-center">
              <div>
                <ListChecks className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-4 font-black">Chưa có nhiệm vụ</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Thêm task thủ công vào phiên bản DRAFT này.
                </p>
                {editable && (
                  <Button className="mt-5" onClick={() => setAddOpen(true)}>
                    <Plus className="size-4" />
                    Thêm nhiệm vụ
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            items.map((item) => (
              <TaskCard
                key={item.id}
                item={item}
                editable={Boolean(editable)}
                executable={Boolean(executable)}
                onDelete={() => setDeleteTarget(item)}
                onProgress={() => setProgressTarget(item)}
                onPomodoro={() => setPomodoro({ open: true, taskId: item.id })}
              />
            ))
          )}
        </div>
      </div>
      {version && (
        <AddTaskModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={async (values) => {
            await action(
              () =>
                apiRequest<DailyPlanItem>(
                  `/api/v1/daily-plans/${id}/versions/${version.id}/items`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Đã thêm nhiệm vụ vào bản DRAFT.",
            );
            setAddOpen(false);
          }}
        />
      )}
      {progressTarget && (
        <ProgressModal
          open
          item={progressTarget}
          onClose={() => setProgressTarget(null)}
          onSave={async (values) => {
            await action(
              () =>
                apiRequest<DailyPlanItem>(
                  `/api/v1/daily-plans/${id}/items/${progressTarget.id}/progress`,
                  { method: "POST", body: JSON.stringify(values) },
                ),
              "Tiến độ đã được ghi vào lịch sử.",
            );
            setProgressTarget(null);
          }}
        />
      )}
      <PomodoroModal
        open={pomodoro.open}
        onClose={() => setPomodoro({ open: false })}
        items={items}
        initialTaskId={pomodoro.taskId}
        onComplete={recordPomodoro}
      />
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xóa nhiệm vụ?"
        description="Chỉ task trong bản DRAFT chưa có lịch sử tiến độ mới có thể bị xóa."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void remove()}>
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Metric({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
function TaskCard({
  item,
  editable,
  executable,
  onDelete,
  onProgress,
  onPomodoro,
}: {
  item: DailyPlanItem;
  editable: boolean;
  executable: boolean;
  onDelete: () => void;
  onProgress: () => void;
  onPomodoro: () => void;
}) {
  const status = {
    NOT_STARTED: { label: "Chưa bắt đầu", tone: "slate" as const, icon: Circle },
    IN_PROGRESS: { label: "Đang thực hiện", tone: "indigo" as const, icon: MoreHorizontal },
    COMPLETED: { label: "Hoàn thành", tone: "emerald" as const, icon: Check },
    PARTIALLY_COMPLETED: {
      label: "Hoàn thành một phần",
      tone: "amber" as const,
      icon: CheckCircle2,
    },
    SKIPPED: { label: "Đã bỏ qua", tone: "rose" as const, icon: SkipForward },
  }[item.status];
  const Icon = status.icon;
  return (
    <Card className={`p-4 sm:p-5 ${item.status === "COMPLETED" ? "bg-emerald-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${item.status === "COMPLETED" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-extrabold ${item.status === "COMPLETED" ? "text-slate-500 line-through" : "text-slate-950"}`}
            >
              {item.title}
            </h3>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          {item.description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" />
              {item.plannedMinutes ?? 30} phút
            </span>
            <span>{item.category}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {executable && (
            <>
              <button
                onClick={onPomodoro}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Pomodoro"
              >
                <Timer className="size-4" />
              </button>
              <button
                onClick={onProgress}
                className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                title="Ghi tiến độ"
              >
                <CheckCircle2 className="size-4" />
              </button>
            </>
          )}
          {editable && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Xóa"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
function AddTaskModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: {
    title: string;
    description: string;
    category: DailyTaskCategory;
    plannedMinutes: number;
    roadmapItemId: null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DailyTaskCategory>("CUSTOM");
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        plannedMinutes: minutes,
        roadmapItemId: null,
      });
      setTitle("");
      setDescription("");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm nhiệm vụ thủ công"
      description="Task chỉ được thêm vào phiên bản DRAFT đang chọn."
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Tên nhiệm vụ">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field label="Mô tả">
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nhóm">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as DailyTaskCategory)}
            >
              <option value="CUSTOM">Tùy chỉnh</option>
              <option value="REVIEW">Ôn tập</option>
              <option value="NEW_MATERIAL">Kiến thức mới</option>
              <option value="PRACTICE">Thực hành</option>
            </Select>
          </Field>
          <Field label="Dự kiến (phút)">
            <Input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              required
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading} disabled={!title.trim()}>
            Thêm task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ProgressModal({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: DailyPlanItem;
  onClose: () => void;
  onSave: (values: {
    status: ProgressEntryStatus;
    actualMinutes: number;
    actualResult: string;
    difficulty?: number;
    understandingRating?: number;
    note: string;
  }) => Promise<void>;
}) {
  const [status, setStatus] = useState<ProgressEntryStatus>(
    item.status === "PARTIALLY_COMPLETED" || item.status === "SKIPPED" ? item.status : "COMPLETED",
  );
  const [minutes, setMinutes] = useState(item.plannedMinutes ?? 30);
  const [result, setResult] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [understanding, setUnderstanding] = useState(3);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave({
        status,
        actualMinutes: minutes,
        actualResult: result,
        difficulty,
        understandingRating: understanding,
        note,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Ghi nhận kết quả" description={item.title}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Kết quả">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "COMPLETED", label: "Hoàn thành" },
                { value: "PARTIALLY_COMPLETED", label: "Một phần" },
                { value: "SKIPPED", label: "Bỏ qua" },
              ] as const
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`focus-ring rounded-xl border px-2 py-3 text-xs font-bold ${status === option.value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Phút thực tế">
            <Input
              type="number"
              min={0}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </Field>
          <Field label="Độ khó (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value))}
            />
          </Field>
          <Field label="Mức hiểu (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={understanding}
              onChange={(event) => setUnderstanding(Number(event.target.value))}
            />
          </Field>
        </div>
        <Field label="Kết quả thực tế">
          <Input
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder="Bạn đã làm được gì?"
          />
        </Field>
        <Field label="Ghi chú">
          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Khó khăn, điểm cần xem lại…"
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={loading}>
            Lưu tiến độ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
