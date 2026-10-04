"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageLoading } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import { dailyPlanApi } from "@/features/daily/daily-plan-api";
import { CreatePlanModal } from "@/features/daily/daily-plans-view";
import { ApiClientError, apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDateOnly, todayIso } from "@/lib/format";
import type { DailyPlan, PageResponse, RoadmapSummary } from "@/types/api";

export default function TodayDailyPlanPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiConfirmOpen, setAiConfirmOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");

  const userTimeZone = profile?.profile?.timeZone || "Asia/Ho_Chi_Minh";
  const todayDate = todayIso(userTimeZone);

  const checkTodayPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRequestId(null);
    try {
      const plan = await dailyPlanApi.getTodayPlan();
      if (plan) {
        // AC2: Plan for today exists -> navigate directly to exact plan
        router.replace(`/daily-plans/${plan.id}`);
        return;
      }

      // AC3: Plan does not exist for today -> load roadmaps for creation options
      const roadmapsRes = await apiRequest<PageResponse<RoadmapSummary>>(
        "/api/v1/roadmaps?status=ACTIVE&page=0&size=100&sort=updatedAt,desc",
      ).catch(() => ({ content: [] as RoadmapSummary[] }));
      setRoadmaps(roadmapsRes.content);
      setSelectedRoadmapId(
        roadmapsRes.content.length === 1 ? roadmapsRes.content[0].id : "",
      );
      setLoading(false);
    } catch (err) {
      setError(getErrorMessage(err));
      if (err instanceof ApiClientError && err.details.requestId) {
        setRequestId(err.details.requestId);
      }
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void checkTodayPlan(), 0);
    return () => window.clearTimeout(timerId);
  }, [checkTodayPlan]);

  async function handleAiGenerateConfirm() {
    if (!selectedRoadmapId) {
      show("Vui lòng chọn một lộ trình đang hoạt động trước khi tạo bằng AI.", "error");
      return;
    }

    setAiGenerating(true);
    try {
      // 1. Create daily plan for today (business rule: requires user confirmation)
      const createdPlan = await apiRequest<DailyPlan>("/api/v1/daily-plans", {
        method: "POST",
        body: JSON.stringify({
          planDate: todayDate,
          roadmapId: selectedRoadmapId,
        }),
      });

      // 2. Request AI generation for the created plan
      await apiRequest(`/api/v1/daily-plans/${createdPlan.id}/generate-ai`, {
        method: "POST",
        headers: { "Idempotency-Key": `today-ai-${createdPlan.id}` },
      });

      show("Đã tạo kế hoạch hôm nay và gửi yêu cầu cho AI đề xuất.");
      setAiConfirmOpen(false);
      router.push(`/daily-plans/${createdPlan.id}`);
    } catch (err) {
      show(getErrorMessage(err), "error");
    } finally {
      setAiGenerating(false);
    }
  }

  if (loading) {
    return <PageLoading label="Đang kiểm tra kế hoạch học tập hôm nay…" />;
  }

  // Exception flow: Data load error keeps user on page with retry and requestId
  if (error) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700 transition"
          >
            <ArrowLeft className="size-4" />
            Về trang tổng quan
          </Link>
        </div>

        <Card className="p-8 text-center border-rose-200 bg-rose-50/50">
          <AlertCircle className="mx-auto size-10 text-rose-500" />
          <h2 className="mt-4 text-lg font-black text-rose-900">
            Không thể tải kế hoạch hôm nay
          </h2>
          <p className="mt-2 text-sm text-rose-700 max-w-md mx-auto">{error}</p>
          {requestId && (
            <p className="mt-1 text-xs text-rose-500 font-mono">
              Mã yêu cầu (Request ID): {requestId}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => void checkTodayPlan()}>
              <RefreshCw className="size-4" />
              Thử lại
            </Button>
            <Link
              href="/daily-plans"
              className="focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Xem danh sách lịch sử
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // AC3: Empty state when no plan exists for today
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-slate-500 hover:text-indigo-700 transition"
        >
          <ArrowLeft className="size-4" />
          Về trang tổng quan
        </Link>
        <Link
          href="/daily-plans"
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
        >
          Xem lịch sử kế hoạch
        </Link>
      </div>

      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="p-8 sm:p-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-bold text-indigo-700 mb-4">
            <CalendarDays className="size-3.5" />
            <span>
              Hôm nay · {formatDateOnly(todayDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} ({userTimeZone})
            </span>
          </div>

          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
            <CalendarCheck2 className="size-8" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Chưa có kế hoạch học tập cho hôm nay
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Lập kế hoạch giúp bạn tập trung hoàn thành các nhiệm vụ cốt lõi và theo dõi tiến độ rõ ràng.
            Hệ thống sẽ không tự ý tạo kế hoạch cho đến khi bạn xác nhận lựa chọn bên dưới.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="success"
              onClick={() => setCreateModalOpen(true)}
              className="w-full sm:w-auto h-11 px-5 shadow-xs"
            >
              <Plus className="size-4" />
              Tạo kế hoạch thủ công
            </Button>

            <Button
              onClick={() => setAiConfirmOpen(true)}
              disabled={roadmaps.length === 0}
              title={
                roadmaps.length === 0
                  ? "Bạn cần kích hoạt một lộ trình trước khi tạo kế hoạch bằng AI."
                  : undefined
              }
              className="w-full sm:w-auto h-11 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 border-none shadow-sm"
            >
              <Sparkles className="size-4" />
              Sinh kế hoạch bằng AI
            </Button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-400">
            Múi giờ hiện tại: <span className="font-semibold text-slate-600">{userTimeZone}</span>.
            Bạn có thể đổi múi giờ trong <Link href="/profile" className="font-bold text-indigo-600 hover:underline">Hồ sơ cá nhân</Link>.
          </div>
        </div>
      </Card>

      {/* Manual Creation Modal */}
      {createModalOpen && (
        <CreatePlanModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          roadmaps={roadmaps}
          timeZone={userTimeZone}
          defaultMinutes={profile?.profile?.defaultDailyMinutes ?? 60}
          initialPlanDate={todayDate}
        />
      )}

      {/* AI Generation Confirmation Modal */}
      {aiConfirmOpen && (
        <Modal
          open={aiConfirmOpen}
          onClose={() => setAiConfirmOpen(false)}
          title="Tạo kế hoạch hôm nay bằng AI"
          description={`Tạo kế hoạch cho ngày ${formatDateOnly(todayDate)} và yêu cầu AI tự động phân bổ nhiệm vụ theo lộ trình đang học.`}
          closeDisabled={aiGenerating}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              AI sẽ xem xét lộ trình đang hoạt động của bạn, số phút cam kết mỗi ngày và các chủ đề yếu (nếu có) để tạo một bản kế hoạch DRAFT phù hợp.
            </p>

            {roadmaps.length === 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-amber-800 border border-amber-200">
                Bạn chưa có lộ trình ACTIVE. Hãy tạo kế hoạch thủ công hoặc kích hoạt một lộ trình trước khi dùng AI.
              </div>
            )}

            {roadmaps.length > 0 && (
              <Field label="Lộ trình dùng để tạo kế hoạch">
                <Select
                  value={selectedRoadmapId}
                  onChange={(event) => setSelectedRoadmapId(event.target.value)}
                  disabled={aiGenerating}
                >
                  {roadmaps.length > 1 && <option value="">Chọn lộ trình</option>}
                  {roadmaps.map((roadmap) => (
                    <option key={roadmap.id} value={roadmap.id}>
                      {roadmap.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                disabled={aiGenerating}
                onClick={() => setAiConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={aiGenerating}
                disabled={!selectedRoadmapId}
                onClick={() => void handleAiGenerateConfirm()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Sparkles className="size-3.5" />
                Xác nhận tạo bằng AI
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
