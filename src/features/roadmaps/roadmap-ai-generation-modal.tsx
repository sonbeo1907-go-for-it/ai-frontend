"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Coins, FileText, Sparkles, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { fetchAiPrices, fetchCreditWallet, type CreditWallet } from "@/features/billing/billing-api";
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
  const [creditRate, setCreditRate] = useState<number>(10);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchAiPrices(), fetchCreditWallet()]).then(([pricesRes, walletRes]) => {
      if (!active) return;
      if (pricesRes.status === "fulfilled") {
        const rate = pricesRes.value.find((r) => r.purpose === "ROADMAP_GENERATION");
        if (rate) setCreditRate(rate.creditCost);
      }
      if (walletRes.status === "fulfilled") {
        setWallet(walletRes.value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

        {/* US-CRD-01: Hiển thị giá Credit trước khi người dùng xác nhận thao tác AI */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Coins className="size-4 text-amber-500" />
              <span>Chi phí thao tác:</span>
              <span className="font-bold text-slate-900">{creditRate} AI Credits</span>
            </div>
            {wallet && (
              <div className="flex items-center gap-2 text-slate-600">
                <Wallet className="size-4 text-indigo-500" />
                <span>Số dư khả dụng:</span>
                <span
                  className={`font-bold ${
                    wallet.availableCredits < creditRate ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {wallet.availableCredits} Credits
                </span>
              </div>
            )}
          </div>

          {wallet && wallet.availableCredits < creditRate && (
            <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">
                    Số dư AI Credit không đủ để thực hiện thao tác (Cần {creditRate} credit, khả dụng: {wallet.availableCredits} credit).
                  </p>
                  <p className="text-amber-700">
                    Bạn có thể nạp thêm Credit vào ví hoặc tiếp tục bằng quy trình lập lộ trình thủ công hiện có.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <a
                      href="/billing"
                      className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white shadow-sm transition hover:bg-amber-700"
                    >
                      Nạp thêm Credit
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                    >
                      Tiếp tục tạo thủ công
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
            disabled={loadingMaterials || (wallet !== null && wallet.availableCredits < creditRate)}
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
