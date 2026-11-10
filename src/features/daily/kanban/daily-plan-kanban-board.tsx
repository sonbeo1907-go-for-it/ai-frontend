"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  CheckCircle2,
  Circle,
  Clock3,
  GripVertical,
  History,
  ListChecks,
  Play,
  SkipForward,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dailyTaskCategoryLabels } from "@/lib/display-labels";
import { cn } from "@/lib/cn";
import type { DailyPlanItem, ProgressEntryStatus } from "@/types/api";

type KanbanColumnId = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "UNFINISHED";

const COLUMNS: Array<{
  id: KanbanColumnId;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    id: "NOT_STARTED",
    title: "Chưa bắt đầu",
    description: "Nhiệm vụ đang chờ",
    accent: "bg-slate-400",
  },
  {
    id: "IN_PROGRESS",
    title: "Đang học",
    description: "Nhiệm vụ đang thực hiện",
    accent: "bg-indigo-500",
  },
  {
    id: "COMPLETED",
    title: "Hoàn thành",
    description: "Đã ghi nhận 100%",
    accent: "bg-emerald-500",
  },
  {
    id: "UNFINISHED",
    title: "Chưa hoàn tất",
    description: "Một phần hoặc đã bỏ qua",
    accent: "bg-amber-500",
  },
];

function columnFor(item: DailyPlanItem): KanbanColumnId {
  if (item.status === "PARTIALLY_COMPLETED" || item.status === "SKIPPED") {
    return "UNFINISHED";
  }
  return item.status;
}

function isTerminal(item: DailyPlanItem) {
  return ["COMPLETED", "PARTIALLY_COMPLETED", "SKIPPED"].includes(item.status);
}

interface DailyPlanKanbanBoardProps {
  items: DailyPlanItem[];
  executable: boolean;
  pendingItemId?: string | null;
  onStart: (item: DailyPlanItem) => void;
  onRequestOutcome: (item: DailyPlanItem, status: ProgressEntryStatus) => void;
  onOpenSteps: (item: DailyPlanItem) => void;
  onHistory: (item: DailyPlanItem) => void;
  onPomodoro: (item: DailyPlanItem) => void;
}

export function DailyPlanKanbanBoard({
  items,
  executable,
  pendingItemId,
  onStart,
  onRequestOutcome,
  onOpenSteps,
  onHistory,
  onPomodoro,
}: DailyPlanKanbanBoardProps) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const activeItem = activeItemId ? (items.find((item) => item.id === activeItemId) ?? null) : null;

  const itemsByColumn = useMemo(() => {
    const grouped = new Map<KanbanColumnId, DailyPlanItem[]>(
      COLUMNS.map((column) => [column.id, []]),
    );
    for (const item of [...items].sort(
      (left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
    )) {
      grouped.get(columnFor(item))?.push(item);
    }
    return grouped;
  }, [items]);

  function handleDragStart(event: DragStartEvent) {
    setActiveItemId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItemId(null);
    const item = items.find((candidate) => candidate.id === String(event.active.id));
    const target = event.over?.id as KanbanColumnId | undefined;
    if (!item || !target || !executable || isTerminal(item) || target === columnFor(item)) {
      return;
    }
    if (target === "IN_PROGRESS" && item.status === "NOT_STARTED") {
      onStart(item);
      return;
    }
    if (target === "COMPLETED") {
      onRequestOutcome(item, "COMPLETED");
      return;
    }
    if (target === "UNFINISHED") {
      onRequestOutcome(item, "PARTIALLY_COMPLETED");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveItemId(null)}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid auto-cols-[minmax(285px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3"
        aria-label="Bảng Kanban nhiệm vụ trong ngày"
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            items={itemsByColumn.get(column.id) ?? []}
            executable={executable}
            pendingItemId={pendingItemId}
            onStart={onStart}
            onRequestOutcome={onRequestOutcome}
            onOpenSteps={onOpenSteps}
            onHistory={onHistory}
            onPomodoro={onPomodoro}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="w-72 rounded-2xl border border-indigo-300 bg-white p-4 shadow-2xl">
            <p className="text-sm font-extrabold text-slate-950">{activeItem.title}</p>
            <p className="mt-1 text-xs text-slate-500">Thả vào cột trạng thái phù hợp</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  items,
  executable,
  pendingItemId,
  onStart,
  onRequestOutcome,
  onOpenSteps,
  onHistory,
  onPomodoro,
}: {
  column: (typeof COLUMNS)[number];
  items: DailyPlanItem[];
  executable: boolean;
  pendingItemId?: string | null;
  onStart: (item: DailyPlanItem) => void;
  onRequestOutcome: (item: DailyPlanItem, status: ProgressEntryStatus) => void;
  onOpenSteps: (item: DailyPlanItem) => void;
  onHistory: (item: DailyPlanItem) => void;
  onPomodoro: (item: DailyPlanItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-h-[28rem] rounded-2xl border bg-slate-50/80 p-3 transition",
        isOver ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200",
      )}
      aria-label={`${column.title}: ${items.length} nhiệm vụ`}
    >
      <header className="mb-3 flex items-start justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-full", column.accent)} />
            <h4 className="text-sm font-black text-slate-900">{column.title}</h4>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{column.description}</p>
        </div>
        <Badge tone="slate">{items.length}</Badge>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            executable={executable}
            pending={pendingItemId === item.id}
            onStart={() => onStart(item)}
            onCompleted={() => onRequestOutcome(item, "COMPLETED")}
            onUnfinished={() => onRequestOutcome(item, "PARTIALLY_COMPLETED")}
            onOpenSteps={() => onOpenSteps(item)}
            onHistory={() => onHistory(item)}
            onPomodoro={() => onPomodoro(item)}
          />
        ))}
        {items.length === 0 && (
          <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 text-center text-xs text-slate-400">
            Chưa có nhiệm vụ trong cột này
          </div>
        )}
      </div>
    </section>
  );
}

function KanbanCard({
  item,
  executable,
  pending,
  onStart,
  onCompleted,
  onUnfinished,
  onOpenSteps,
  onHistory,
  onPomodoro,
}: {
  item: DailyPlanItem;
  executable: boolean;
  pending: boolean;
  onStart: () => void;
  onCompleted: () => void;
  onUnfinished: () => void;
  onOpenSteps: () => void;
  onHistory: () => void;
  onPomodoro: () => void;
}) {
  const terminal = isTerminal(item);
  const draggable = executable && !terminal && !pending;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !draggable,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const status = {
    NOT_STARTED: { label: "Chưa bắt đầu", tone: "slate" as const, icon: Circle },
    IN_PROGRESS: { label: "Đang học", tone: "indigo" as const, icon: Play },
    COMPLETED: { label: "Hoàn thành", tone: "emerald" as const, icon: CheckCircle2 },
    PARTIALLY_COMPLETED: {
      label: `Một phần ${item.completionPercentage ?? 0}%`,
      tone: "amber" as const,
      icon: Clock3,
    },
    SKIPPED: { label: "Đã bỏ qua", tone: "rose" as const, icon: SkipForward },
  }[item.status];
  const StatusIcon = status.icon;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition",
        isDragging && "opacity-30",
        pending && "animate-pulse opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="focus-ring mt-0.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Kéo nhiệm vụ ${item.title}`}
          title={draggable ? "Kéo để chuyển trạng thái" : "Nhiệm vụ này không thể kéo"}
          disabled={!draggable}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" onClick={onOpenSteps} className="focus-ring min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <h5 className="text-sm font-extrabold leading-5 text-slate-950">{item.title}</h5>
            <Badge tone={status.tone}>
              <StatusIcon className="mr-1 inline size-3" />
              {status.label}
            </Badge>
          </div>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
          )}
        </button>
      </div>

      {(item.studyUnit || item.learningUnitTitle) && (
        <p className="mt-2 rounded-lg bg-indigo-50 px-2.5 py-2 text-[11px] font-semibold text-indigo-700">
          Đơn vị học: {item.studyUnit?.title ?? item.learningUnitTitle}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Clock3 className="size-3" />
          {item.plannedMinutes ?? 30} phút
        </span>
        <span>{dailyTaskCategoryLabels[item.category]}</span>
        <span className="flex items-center gap-1">
          <ListChecks className="size-3" />
          {item.stepProgress?.completedRequiredCount ?? 0}/{item.stepProgress?.requiredCount ?? 0}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        {executable && item.status === "NOT_STARTED" && (
          <CardAction label="Bắt đầu" onClick={onStart} disabled={pending} />
        )}
        {executable && !terminal && (
          <>
            <CardAction label="Hoàn thành" onClick={onCompleted} disabled={pending} />
            <CardAction label="Chưa hoàn tất" onClick={onUnfinished} disabled={pending} />
            <IconAction label="Mở Pomodoro" onClick={onPomodoro} icon={Timer} />
          </>
        )}
        <IconAction label="Xem các bước" onClick={onOpenSteps} icon={ListChecks} />
        {item.status !== "NOT_STARTED" && (
          <IconAction label="Xem lịch sử" onClick={onHistory} icon={History} />
        )}
      </div>
    </article>
  );
}

function CardAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function IconAction({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Timer;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
      aria-label={label}
      title={label}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
