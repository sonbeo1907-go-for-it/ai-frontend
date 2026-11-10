import { FileCode2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiPromptEmptyState({
  onCreateDraft,
  canCreate = true,
}: {
  onCreateDraft?: () => void;
  canCreate?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label="Không có phiên bản prompt"
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
    >
      <div
        className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm"
        aria-hidden="true"
      >
        <FileCode2 className="size-7" />
      </div>
      <h3 className="mt-4 text-base font-extrabold text-slate-900">
        Chưa có phiên bản System Prompt nào
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
        Hệ thống đang sử dụng prompt mặc định từ mã nguồn (Code Fallback). Tạo bản nháp đầu tiên để tùy biến.
      </p>
      {onCreateDraft && canCreate && (
        <div className="mt-6">
          <Button type="button" onClick={onCreateDraft}>
            <Plus className="size-4" />
            Tạo bản nháp đầu tiên
          </Button>
        </div>
      )}
    </div>
  );
}
