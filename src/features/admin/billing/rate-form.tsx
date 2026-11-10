"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { AiPurpose } from "@/types/api";
import { AI_PURPOSES, purposeLabels } from "../ai-provider-labels";
import { adminBillingApi, type AdminCreditRate } from "./admin-billing-api";
import { category, integer } from "./billing-form-utils";

export function RateForm({
  item,
  onClose,
  onSaved,
}: {
  item: AdminCreditRate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [purpose, setPurpose] = useState<AiPurpose>(item?.purpose ?? "ROADMAP_GENERATION");
  const [modelCategory, setCategory] = useState(item?.modelCategory ?? "");
  const [cost, setCost] = useState(String(item?.creditCost ?? 5));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || conflict) return;
    const creditCost = integer(cost, 1);
    const normalized = category(modelCategory);
    if (creditCost === null || (normalized && !/^[A-Z0-9_-]{1,50}$/.test(normalized))) {
      setError("Giá phải là số nguyên dương; nhóm giá chỉ gồm chữ, số, _ hoặc -.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const input = { purpose, modelCategory: normalized, creditCost, version: item?.version };
      if (item) await adminBillingApi.replaceRate(item.id, input);
      else await adminBillingApi.createRate(input);
      onSaved();
    } catch (failure) {
      setConflict(isApiErrorCode(failure, "CONCURRENT_MODIFICATION"));
      setError(getErrorMessage(failure));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={saving}
      title={item ? "Thay thế giá Credit" : "Tạo giá Credit"}
      description={
        item?.status === "ACTIVE"
          ? "Giá mới áp dụng ngay khi lưu. Giá cũ được lưu lịch sử; các khoản giữ chỗ không đổi."
          : "Lưu giá trước, sau đó kích hoạt để áp dụng."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mục đích AI">
          <Select
            value={purpose}
            disabled={!!item || saving}
            onChange={(event) => setPurpose(event.target.value as AiPurpose)}
          >
            {AI_PURPOSES.map((value) => (
              <option key={value} value={value}>
                {purposeLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Nhóm giá (tùy chọn)"
          hint="Để trống là giá mặc định. Nhóm cụ thể phải được gắn trong cấu hình Provider."
        >
          <Input
            value={modelCategory}
            disabled={!!item || saving}
            maxLength={50}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="VD: STANDARD, PREMIUM"
          />
        </Field>
        <Field label="Credit cho mỗi thao tác">
          <Input
            value={cost}
            inputMode="numeric"
            disabled={saving}
            onChange={(event) => setCost(event.target.value)}
          />
        </Field>
        {item && <p className="text-sm text-slate-600">Giá trước: {item.creditCost} Credit</p>}
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {conflict && (
          <p className="text-sm text-amber-700">
            Đóng form và tải lại trước khi tiếp tục. Dữ liệu nhập chưa bị xóa.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={conflict}>
            {item ? "Lưu giá thay thế" : "Lưu giá"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
