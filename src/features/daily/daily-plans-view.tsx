"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StudyDurationField } from "@/components/ui/study-duration-field";
import { EmptyState, PageLoading, ProgressBar } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDateOnly, todayIso } from "@/lib/format";
import { dailyPlanStatusLabels } from "@/lib/display-labels";
import { formatStudyDuration, isValidStudyDuration } from "@/lib/study-duration";
import { dailyPlanApi } from "./daily-plan-api";
import type { DailyPlan, DailyPlanSummary, PageResponse, RoadmapSummary } from "@/types/api";

export function DailyPlansView() {
  const { profile } = useAuth();
  const { show } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [page, setPage] = useState<PageResponse<DailyPlanSummary> | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const requestSequence = useRef(0);

  const userTimeZone = profile?.profile?.timeZone || "Asia/Ho_Chi_Minh";
  const todayDateString = todayIso(userTimeZone);

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const status = searchParams.get("status") ?? "";
  const roadmapId = searchParams.get("roadmapId") ?? "";
  const sort = searchParams.get("sort") ?? "planDate,desc";
  const pageParam = Number.parseInt(searchParams.get("page") ?? "0", 10) || 0;

  const dateRangeError =
    from && to && from > to
      ? "Khoảng ngày không hợp lệ: 'Từ ngày' phải trước hoặc bằng 'Đến ngày'."
      : null;

  const hasActiveFilters = Boolean(
    from || to || status || roadmapId || (sort && sort !== "planDate,desc"),
  );

  const activeFilterCount =
    (from ? 1 : 0) +
    (to ? 1 : 0) +
    (status ? 1 : 0) +
    (roadmapId ? 1 : 0) +
    (sort && sort !== "planDate,desc" ? 1 : 0);

  const updateFilters = useCallback(
    (updates: {
      from?: string;
      to?: string;
      status?: string;
      roadmapId?: string;
      sort?: string;
      page?: number;
    }) => {
      const nextParams = new URLSearchParams();
      const nextFrom = updates.from !== undefined ? updates.from : from;
      const nextTo = updates.to !== undefined ? updates.to : to;
      const nextStatus = updates.status !== undefined ? updates.status : status;
      const nextRoadmapId = updates.roadmapId !== undefined ? updates.roadmapId : roadmapId;
      const nextSort = updates.sort !== undefined ? updates.sort : sort;
      const nextPage = updates.page !== undefined ? updates.page : 0;

      if (nextFrom) nextParams.set("from", nextFrom);
      if (nextTo) nextParams.set("to", nextTo);
      if (nextStatus) nextParams.set("status", nextStatus);
      if (nextRoadmapId) nextParams.set("roadmapId", nextRoadmapId);
      if (nextSort && nextSort !== "planDate,desc") nextParams.set("sort", nextSort);
      if (nextPage > 0) nextParams.set("page", String(nextPage));

      const query = nextParams.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`);
    },
    [from, to, status, roadmapId, sort, pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  const handleQuickToday = useCallback(() => {
    updateFilters({ from: todayDateString, to: todayDateString, page: 0 });
  }, [todayDateString, updateFilters]);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (dateRangeError) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextPlans, nextRoadmaps] = await Promise.all([
        dailyPlanApi.getDailyPlans({
          from: from || undefined,
          to: to || undefined,
          status: status || undefined,
          roadmapId: roadmapId || undefined,
          page: pageParam,
          size: 12,
          sort,
        }),
        roadmaps.length === 0
          ? apiRequest<PageResponse<RoadmapSummary>>(
              "/api/v1/roadmaps?status=ACTIVE&page=0&size=100&sort=updatedAt,desc",
            )
          : Promise.resolve(null),
      ]);
      if (requestId !== requestSequence.current) return;
      setPage(nextPlans);
      if (nextRoadmaps) {
        setRoadmaps(nextRoadmaps.content);
      }
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      show(getErrorMessage(error), "error");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [dateRangeError, from, to, status, roadmapId, pageParam, sort, roadmaps.length, show]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const todayPlan = page?.content.find((p) => p.planDate === todayDateString);

  if (loading && !page) return <PageLoading label="Đang tải lịch sử kế hoạch…" />;

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
        <div className="flex flex-wrap items-center gap-2">
          {todayPlan ? (
            <Link
              href={`/daily-plans/${todayPlan.id}`}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <CalendarDays className="size-4" />
              Mở kế hoạch hôm nay
            </Link>
          ) : (
            <Link
              href="/daily-plans/today"
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-black text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
            >
              <CalendarDays className="size-4 text-indigo-600" />
              Kế hoạch hôm nay
            </Link>
          )}
          <Button variant="success" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Tạo ngày mới
          </Button>
        </div>
      </Card>

      {/* Filter Toolbar (AC1, AC2, AC3, AC4, AC5) */}
      <Card className="p-5 border-slate-200/90 shadow-xs bg-white/95 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Filter className="size-4" />
            </span>
            <span className="text-sm font-black tracking-tight text-slate-800">
              Bộ lọc & Tìm kiếm
            </span>
            {activeFilterCount > 0 && (
              <Badge tone="indigo" className="text-[11px] font-extrabold">
                {activeFilterCount} đang áp dụng
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleQuickToday}
              className="text-xs h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              aria-label="Chọn ngày hôm nay"
            >
              <Calendar className="size-3.5 mr-1" />
              Hôm nay
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                aria-label="Xóa bộ lọc"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <Field label="Từ ngày">
            <Input
              id="filter-from-date"
              type="date"
              value={from}
              onChange={(e) => updateFilters({ from: e.target.value, page: 0 })}
            />
          </Field>

          <Field label="Đến ngày">
            <Input
              id="filter-to-date"
              type="date"
              value={to}
              onChange={(e) => updateFilters({ to: e.target.value, page: 0 })}
            />
          </Field>

          <Field label="Trạng thái">
            <Select
              id="filter-status"
              value={status}
              onChange={(e) => updateFilters({ status: e.target.value, page: 0 })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="READY">Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </Select>
          </Field>

          <Field label="Lộ trình">
            <Select
              id="filter-roadmap"
              value={roadmapId}
              onChange={(e) => updateFilters({ roadmapId: e.target.value, page: 0 })}
            >
              <option value="">Tất cả lộ trình</option>
              {roadmaps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Sắp xếp">
            <Select
              id="filter-sort"
              value={sort}
              onChange={(e) => updateFilters({ sort: e.target.value, page: 0 })}
            >
              <option value="planDate,desc">Mới nhất trước</option>
              <option value="planDate,asc">Cũ nhất trước</option>
            </Select>
          </Field>
        </div>

        {dateRangeError && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{dateRangeError}</span>
          </div>
        )}
      </Card>

      {/* Plan list or Empty State (AC6) */}
      {(page?.content.length ?? 0) === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={Search}
            title="Không tìm thấy kế hoạch phù hợp"
            description="Không có Daily Plan nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                <RotateCcw className="size-4 mr-2" />
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
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
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(page?.content ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isToday={plan.planDate === todayDateString}
            />
          ))}
        </div>
      )}

      {/* Pagination controls (AC4) */}
      {page && page.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page.first}
            onClick={() => updateFilters({ page: page.page - 1 })}
          >
            Trang trước
          </Button>
          <span className="text-xs font-bold text-slate-500">
            Trang {page.page + 1}/{page.totalPages} · {page.totalElements} kế hoạch
          </span>
          <Button
            variant="secondary"
            disabled={page.last}
            onClick={() => updateFilters({ page: page.page + 1 })}
          >
            Trang sau
          </Button>
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

function PlanCard({ plan, isToday }: { plan: DailyPlanSummary; isToday?: boolean }) {
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
                {formatDateOnly(plan.planDate, {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{plan.timeZoneSnapshot}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isToday && (
              <Badge tone="emerald" className="font-extrabold shadow-xs">
                Hôm nay
              </Badge>
            )}
            <Badge tone={tone}>{dailyPlanStatusLabels[plan.status]}</Badge>
          </div>
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

export function CreatePlanModal({
  open,
  onClose,
  onCreated,
  roadmaps,
  timeZone,
  defaultMinutes,
  initialPlanDate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void>;
  roadmaps: RoadmapSummary[];
  timeZone?: string;
  defaultMinutes: number;
  initialPlanDate?: string;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [date, setDate] = useState(initialPlanDate ?? todayIso(timeZone));
  const [useInheritedBudget, setUseInheritedBudget] = useState(true);
  const [minutes, setMinutes] = useState<number | undefined>(defaultMinutes);
  const [roadmapId, setRoadmapId] = useState("");
  const [loading, setLoading] = useState(false);
  const initialDate = initialPlanDate ?? todayIso(timeZone);
  const selectedRoadmap = roadmaps.find((roadmap) => roadmap.id === roadmapId);
  const inheritedMinutes = selectedRoadmap?.dailyCommitmentMinutes ?? defaultMinutes;
  const inheritedSource = selectedRoadmap?.dailyCommitmentMinutes
    ? `Lộ trình “${selectedRoadmap.title}”`
    : "Mặc định tài khoản";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const plan = await apiRequest<DailyPlan>("/api/v1/daily-plans", {
        method: "POST",
        body: JSON.stringify({
          planDate: date,
          availableMinutes: useInheritedBudget ? null : minutes,
          roadmapId: roadmapId || null,
        }),
      });
      show("Kế hoạch DRAFT đã được tạo. Hãy thêm nhiệm vụ trước khi kích hoạt.");
      if (onCreated) {
        await onCreated();
      }
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
      closeDisabled={loading}
      confirmClose={
        date !== initialDate ||
        !useInheritedBudget ||
        Boolean(roadmapId)
      }
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
        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-slate-700">Quỹ thời gian</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="budget-mode"
              className="mt-0.5"
              checked={useInheritedBudget}
              onChange={() => setUseInheritedBudget(true)}
            />
            <span>
              <strong className="block text-sm text-slate-800">Dùng mức được đề xuất</strong>
              <span className="mt-1 block text-xs text-slate-500">
                {inheritedSource}: {formatStudyDuration(inheritedMinutes)}. Máy chủ sẽ xác nhận giá trị khi tạo.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
            <input
              type="radio"
              name="budget-mode"
              className="mt-0.5"
              checked={!useInheritedBudget}
              onChange={() => setUseInheritedBudget(false)}
            />
            <span>
              <strong className="block text-sm text-slate-800">Tùy chỉnh cho ngày này</strong>
              <span className="mt-1 block text-xs text-slate-500">
                Chỉ thay đổi snapshot của phiên bản kế hoạch ngày mới.
              </span>
            </span>
          </label>
        </fieldset>
        {!useInheritedBudget ? (
          <StudyDurationField
            value={minutes}
            onChange={setMinutes}
            legend="Thời gian dành riêng cho ngày này"
          />
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="success"
            loading={loading}
            disabled={!useInheritedBudget && !isValidStudyDuration(minutes)}
          >
            Tạo ngày mới
          </Button>
        </div>
      </form>
    </Modal>
  );
}
