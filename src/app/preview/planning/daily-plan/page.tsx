"use client";

import { PlanLayout } from "@/features/planning/plan-layout";
import { DailyPlanView } from "@/features/planning/daily-plan-view";

export default function PreviewDailyPlanPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            AI Planning
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Quản lý lộ trình tổng thể và kế hoạch hàng ngày với sự hỗ trợ của AI.
          </p>
        </div>
        <PlanLayout>
          <DailyPlanView />
        </PlanLayout>
      </main>
    </div>
  );
}
