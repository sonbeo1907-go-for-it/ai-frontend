"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Plus } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageLoading, ProgressBar } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDate, todayIso } from "@/lib/format";
import type { DailyPlan, Roadmap } from "@/types/api";

export function DailyPlansView() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const [nextPlans, nextRoadmaps] = await Promise.all([
        apiRequest<DailyPlan[]>("/api/v1/daily-plans"),
        apiRequest<Roadmap[]>("/api/v1/roadmaps"),
      ]);
      setPlans([...nextPlans].sort((a, b) => b.planDate.localeCompare(a.planDate)));
      setRoadmaps(nextRoadmaps.filter((item) => item.status === "ACTIVE"));
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  if (loading) return <PageLoading label="Đang tải lịch sử kế hoạch…" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight">Biến ý định thành checklist</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mỗi ngày có lịch sử phiên bản riêng và tiến độ thực tế tách khỏi nội dung kế hoạch.
            </p>
          </div>
        </div>
        <Button variant="success" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Tạo ngày mới
        </Button>
      </Card>

      {plans.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có kế hoạch ngày"
          description="Chọn ngày, quỹ thời gian và bắt đầu thêm các nhiệm vụ học tập thủ công."
          action={
            <Button variant="success" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Tạo kế hoạch đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      <CreatePlanModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          await load();
        }}
        roadmaps={roadmaps}
        timeZone={profile?.profile?.timeZone}
        defaultMinutes={profile?.profile?.defaultDailyMinutes ?? 60}
      />
    </div>
  );
}

function PlanCard({ plan }: { plan: DailyPlan }) {
  const tone =
    plan.status === "COMPLETED"
      ? "emerald"
      : plan.status === "IN_PROGRESS"
        ? "indigo"
        : plan.status === "CANCELLED"
          ? "rose"
          : "slate";
  return (
    <Link href={`/daily-plans/${plan.id}`} className="group">
      <Card className="p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              <span className="text-lg font-black">{plan.planDate.slice(-2)}</span>
            </span>
            <div>
              <h3 className="text-base font-black">
                {formatDate(`${plan.planDate}T00:00:00`, {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{plan.timeZoneSnapshot}</p>
            </div>
          </div>
          <Badge tone={tone}>{plan.status}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
          <span>
            <Clock3 className="mb-1 size-3.5 text-slate-400" />
            <strong>
              {plan.totalPlannedMinutes}/{plan.availableMinutes} phút
            </strong>
          </span>
          <span>
            <CheckCircle2 className="mb-1 size-3.5 text-slate-400" />
            <strong>
              {plan.completedItemsCount}/{plan.totalItemsCount} task
            </strong>
          </span>
          <span className="text-right">
            <strong className="text-lg text-indigo-700">{plan.completionPercentage}%</strong>
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={plan.completionPercentage} />
        </div>
        <div className="mt-4 flex justify-end">
          <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">
            Mở kế hoạch <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

function CreatePlanModal({
  open,
  onClose,
  onCreated,
  roadmaps,
  timeZone,
  defaultMinutes,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  roadmaps: Roadmap[];
  timeZone?: string;
  defaultMinutes: number;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [date, setDate] = useState(todayIso(timeZone));
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [roadmapId, setRoadmapId] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const plan = await apiRequest<DailyPlan>("/api/v1/daily-plans", {
        method: "POST",
        body: JSON.stringify({
          planDate: date,
          availableMinutes: minutes,
          roadmapId: roadmapId || null,
        }),
      });
      show("Kế hoạch DRAFT đã được tạo. Hãy thêm nhiệm vụ trước khi kích hoạt.");
      await onCreated();
      router.push(`/daily-plans/${plan.id}`);
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
      title="Tạo kế hoạch ngày"
      description="Kế hoạch mới bắt đầu ở DRAFT và chưa tự động tạo nhiệm vụ từ lộ trình."
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label="Ngày học">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Quỹ thời gian">
          <Select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            <option value={30}>30 phút</option>
            <option value={60}>1 giờ</option>
            <option value={120}>2 giờ</option>
            <option value={180}>3 giờ</option>
          </Select>
        </Field>
        <Field
          label="Lộ trình liên quan"
          hint="Không bắt buộc. Việc chọn lộ trình không tự động tạo task."
        >
          <Select value={roadmapId} onChange={(event) => setRoadmapId(event.target.value)}>
            <option value="">Không liên kết</option>
            {roadmaps.map((roadmap) => (
              <option value={roadmap.id} key={roadmap.id}>
                {roadmap.title || "Lộ trình từ khảo sát"}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="success" loading={loading}>
            Tạo ngày mới
          </Button>
        </div>
      </form>
    </Modal>
  );
}
