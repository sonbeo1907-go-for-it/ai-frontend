"use client";

import {
  Archive,
  CircleAlert,
  FileArchive,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBytes, formatDate } from "@/lib/format";
import type { Material } from "@/types/api";

export interface MaterialCardProps {
  material: Material;
  isArchived: boolean;
  onArchive: (material: Material) => void;
  onRestore: (material: Material) => void;
  restoring?: boolean;
}

export function MaterialCard({
  material,
  isArchived,
  onArchive,
  onRestore,
  restoring,
}: MaterialCardProps) {
  const status = {
    PENDING: { label: "Chờ xử lý", tone: "amber" as const },
    PROCESSING: { label: "Đang trích xuất", tone: "indigo" as const },
    READY: { label: "Sẵn sàng", tone: "emerald" as const },
    FAILED: { label: "Xử lý thất bại", tone: "rose" as const },
  }[material.status];

  return (
    <Card className="group flex min-h-52 flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          {material.type === "FILE" ? (
            <FileArchive className="size-5" />
          ) : (
            <FileText className="size-5" />
          )}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <h3 className="mt-4 line-clamp-2 text-sm font-extrabold leading-5 text-slate-900">
        {material.originalFileName ||
          (material.type === "GOAL_DESCRIPTION" ? "Mô tả mục tiêu" : "Văn bản học tập")}
      </h3>

      <p className="mt-2 text-xs text-slate-500">
        {material.type === "FILE"
          ? `${formatBytes(material.fileSize)} · ${material.contentType || "Tệp tài liệu"}`
          : "Nội dung nhập trực tiếp"}
      </p>

      {material.status === "FAILED" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {material.errorMessage || material.errorCode || "Không thể trích xuất nội dung."}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-slate-400">
            Tạo: {formatDate(material.createdAt)}
          </span>
          {isArchived && material.archivedAt && (
            <span className="text-[11px] font-semibold text-amber-700">
              Đã lưu trữ: {formatDate(material.archivedAt)}
            </span>
          )}
        </div>

        {isArchived ? (
          <Button
            size="sm"
            variant="secondary"
            loading={restoring}
            onClick={() => onRestore(material)}
            className="h-8 gap-1.5 px-2.5 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Khôi phục tài liệu"
          >
            <RotateCcw className="size-3.5" />
            Khôi phục
          </Button>
        ) : (
          <button
            onClick={() => onArchive(material)}
            className="focus-ring rounded-lg p-2 text-slate-400 opacity-70 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
            aria-label="Lưu trữ tài liệu"
          >
            <Archive className="size-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
