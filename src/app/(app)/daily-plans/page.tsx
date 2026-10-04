import { Suspense } from "react";
import { DailyPlansView } from "@/features/daily/daily-plans-view";
import { PageLoading } from "@/components/ui/states";

export default function DailyPlansPage() {
  return (
    <Suspense fallback={<PageLoading label="Đang tải lịch sử kế hoạch…" />}>
      <DailyPlansView />
    </Suspense>
  );
}
