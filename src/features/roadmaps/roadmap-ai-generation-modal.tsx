"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { apiRequest, getErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Material, PageResponse } from "@/types/api";

const MAX_SELECTED_MATERIALS = 10;

export type RoadmapAiGenerationInput = {
  materialIds: string[];
  adjustmentPrompt: string;
};

type RoadmapAiGenerationModalProps = {
  mode: "generate" | "regenerate";
  busy: boolean;
  submissionError?: string;
  onClose: () => void;
  onSubmit: (input: RoadmapAiGenerationInput) => void;
};

export function RoadmapAiGenerationModal({
  mode,
  busy,
  submissionError,
  onClose,
  onSubmit,
}: RoadmapAiGenerationModalProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adjustmentPrompt, setAdjustmentPrompt] = useState("");
  const [loadingMaterials, setLoadingMaterials] = useState(mode === "generate");
  const [materialsError, setMaterialsError] = useState("");

  const loadMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    setMaterialsError("");

    try {
      const page = await apiRequest<PageResponse<Material>>(
        "/api/v1/materials?status=READY&page=0&size=100&sort=createdAt,desc",
      );
      setMaterials(page.content);
    } catch (error) {
      setMaterialsError(getErrorMessage(error));
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "generate") return;

    const timeoutId = window.setTimeout(() => void loadMaterials(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadMaterials, mode]);

  const selectedCountLabel = useMemo(
    () => `${selectedIds.length}/${MAX_SELECTED_MATERIALS} tài liệu`,
    [selectedIds.length],
  );

  function toggleMaterial(materialId: string) {
    setSelectedIds((current) => {
      if (current.includes(materialId)) {
        return current.filter((id) => id !== materialId);
      }

      if (current.length >= MAX_SELECTED_MATERIALS) {
        return current;
      }

      return [...current, materialId];
    });
  }

  function submit() {
    onSubmit({
      materialIds: selectedIds,
      adjustmentPrompt: adjustmentPrompt.trim(),
    });
  }

  const isGenerate = mode === "generate";

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      closeDisabled={busy}
      confirmClose={selectedIds.length > 0 || adjustmentPrompt.trim().length > 0}
      title={isGenerate ? "Sinh lộ trình bằng AI" : "Tái tạo lộ trình bằng AI"}
      description={
        isGenerate
          ? "AI sẽ dùng mục tiêu lộ trình và các tài liệu bạn chọn để tạo một bản DRAFT có thể chỉnh sửa."
          : "Mô tả điều bạn muốn thay đổi. Phiên bản hiện tại vẫn được giữ trong lịch sử."
      }
    >
      <div className="space-y-5">
        {isGenerate ? (
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Tài liệu tham khảo</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Không bắt buộc. Nếu không chọn, AI sẽ dựa trên mục tiêu và thông số lộ trình.
                </p>
              </div>
              <Badge tone={selectedIds.length ? "indigo" : "slate"}>{selectedCountLabel}</Badge>
            </div>

            {loadingMaterials ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Đang tải tài liệu sẵn sàng…
              </div>
            ) : materialsError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                {materialsError}
              </div>
            ) : materials.length ? (
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {materials.map((material) => {
                  const selected = selectedIds.includes(material.id);
                  const selectionLimitReached =
                    !selected && selectedIds.length >= MAX_SELECTED_MATERIALS;

                  return (
                    <button
                      key={material.id}
                      type="button"
                      disabled={selectionLimitReached || busy}
                      aria-pressed={selected}
                      onClick={() => toggleMaterial(material.id)}
                      className={`focus-ring flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                        selected
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-indigo-200"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selected ? <Check className="size-4" /> : <FileText className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-slate-900">
                          {material.originalFileName || materialLabel(material)}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {materialLabel(material)} · {formatDate(material.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                Chưa có tài liệu ở trạng thái sẵn sàng. Bạn vẫn có thể sinh lộ trình từ mục tiêu.
              </div>
            )}
          </section>
        ) : (
          <Field
            label="Yêu cầu điều chỉnh"
            hint={`${adjustmentPrompt.length}/1000 ký tự · không bắt buộc`}
          >
            <Textarea
              autoFocus
              rows={6}
              maxLength={1000}
              value={adjustmentPrompt}
              disabled={busy}
              onChange={(event) => setAdjustmentPrompt(event.target.value)}
              placeholder="Ví dụ: Tăng phần thực hành dự án và rút ngắn nội dung lý thuyết cơ bản…"
            />
          </Field>
        )}

        {submissionError && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {submissionError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="success"
            loading={busy}
            disabled={loadingMaterials}
            onClick={submit}
          >
            <Sparkles className="size-4" />
            {isGenerate ? "Sinh bản DRAFT" : "Tạo phiên bản mới"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function materialLabel(material: Material) {
  if (material.type === "FILE") return "Tệp tài liệu";
  if (material.type === "GOAL_DESCRIPTION") return "Mô tả mục tiêu";
  return "Văn bản học tập";
}
