"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, CalendarDays, Map } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/planning/master-plan", label: "Master Plan", icon: Map },
  { href: "/planning/daily-plan", label: "Daily Plan", icon: CalendarDays },
];

export function PlanLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-100">
            <BrainCircuit className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-tight">AI Planning</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý lộ trình tổng thể và kế hoạch hàng ngày với sự hỗ trợ của AI.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <nav className="flex gap-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "focus-ring relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                  active
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className={cn("size-4", active ? "text-white" : "text-slate-400")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Content ── */}
      <div>{children}</div>
    </div>
  );
}
