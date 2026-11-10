import { ExternalLink, FileText, Map, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GuidanceReferenceProvenance, TaskGuidanceReference } from "@/types/api";

const provenanceDisplay: Record<
  GuidanceReferenceProvenance,
  { label: string; icon: typeof FileText }
> = {
  MATERIAL: { label: "Tài liệu cá nhân", icon: Paperclip },
  LEARNING_SOURCE: { label: "Nguồn học tập", icon: FileText },
  ROADMAP_CONTEXT: { label: "Nội dung từ lộ trình", icon: Map },
  UNVERIFIED_EXTERNAL: { label: "Liên kết ngoài", icon: ExternalLink },
};

export function TaskGuidanceReferenceList({ references }: { references: TaskGuidanceReference[] }) {
  if (references.length === 0) return null;

  return (
    <ul className="space-y-2" aria-label="Tài liệu tham khảo">
      {references.map((reference) => {
        const display = provenanceDisplay[reference.provenance];
        const Icon = display.icon;
        const external = reference.provenance === "UNVERIFIED_EXTERNAL";

        return (
          <li
            key={reference.id}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />
              {external && reference.externalUrl ? (
                <a
                  href={reference.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring min-w-0 break-words font-bold text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900"
                >
                  {reference.displayLabel}
                  <span className="sr-only"> (mở trong thẻ mới)</span>
                </a>
              ) : (
                <span className="min-w-0 break-words font-bold text-slate-800">
                  {reference.displayLabel}
                </span>
              )}
              <Badge tone={external ? "amber" : "slate"}>{display.label}</Badge>
              {external && <Badge tone="amber">Gợi ý chưa xác minh</Badge>}
            </div>
            {reference.locator && (
              <p className="mt-1 text-xs leading-5 text-slate-500">{reference.locator}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
