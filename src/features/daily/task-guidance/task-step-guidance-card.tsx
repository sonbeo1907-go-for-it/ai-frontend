"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb, ShieldAlert, Sparkles, Target } from "lucide-react";
import type { TaskStepGuidance } from "@/types/api";
import { TaskGuidanceReferenceList } from "./task-guidance-reference-list";

export function TaskStepGuidanceCard({
  guidance,
  stepTitle,
  historical = false,
}: {
  guidance: TaskStepGuidance;
  stepTitle?: string;
  historical?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const title = historical
    ? `Hướng dẫn bước lịch sử ${guidance.orderIndex + 1}`
    : stepTitle || `Bước ${guidance.orderIndex + 1}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/40">
      <button
        type="button"
        className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-indigo-500">
            Hướng dẫn AI · Bước {guidance.orderIndex + 1}
          </span>
          <span className="mt-0.5 block text-sm font-extrabold text-slate-900">{title}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-indigo-500 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-indigo-100 bg-white px-4 py-4">
          <GuidanceSection icon={Lightbulb} title="Cách thực hiện" value={guidance.instructions} />
          <GuidanceSection icon={Target} title="Kết quả mong đợi" value={guidance.expectedResult} />
          <GuidanceSection title="Chuẩn bị" value={guidance.prerequisites} />
          <GuidanceSection title="Mẹo" value={guidance.tips} />
          <GuidanceSection icon={ShieldAlert} title="Lưu ý" value={guidance.cautions} />
          <TaskGuidanceReferenceList references={guidance.references} />
        </div>
      )}
    </article>
  );
}

function GuidanceSection({
  icon: Icon,
  title,
  value,
}: {
  icon?: typeof Lightbulb;
  title: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <section>
      <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {Icon && <Icon className="size-3.5" aria-hidden="true" />}
        {title}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </section>
  );
}
