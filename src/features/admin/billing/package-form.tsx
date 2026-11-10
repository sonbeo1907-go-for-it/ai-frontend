"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import { adminBillingApi, type AdminCreditPackage } from "./admin-billing-api";
import { credits, integer } from "./billing-form-utils";

export function PackageForm({
  item,
  onClose,
  onSaved,
}: {
  item: AdminCreditPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    packageCode: item?.packageCode ?? "",
    name: item?.name ?? "",
    priceVnd: String(item?.priceVnd ?? 50000),
    baseCredits: String(item?.baseCredits ?? 5000),
    bonusCredits: String(item?.bonusCredits ?? 0),
    sortOrder: String(item?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const inFlight = useRef(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || conflict) return;
    const nextErrors: Record<string, string> = {};
    const priceVnd = integer(form.priceVnd, 1);
    const baseCredits = integer(form.baseCredits, 1);
    const bonusCredits = integer(form.bonusCredits);
    const sortOrder = integer(form.sortOrder);
    if (!/^[A-Z0-9_-]{1,50}$/.test(form.packageCode))
      nextErrors.packageCode = "Dùng chữ hoa, số, _ hoặc -.";
    if (!form.name.trim()) nextErrors.name = "Nhập tên gói.";
    if (priceVnd === null) nextErrors.priceVnd = "Nhập số nguyên dương hợp lệ.";
    if (baseCredits === null) nextErrors.baseCredits = "Nhập số nguyên dương hợp lệ.";
    if (bonusCredits === null) nextErrors.bonusCredits = "Nhập số nguyên không âm.";
    if (sortOrder === null || sortOrder > 2147483647) nextErrors.sortOrder = "Thứ tự không hợp lệ.";
    if (
      baseCredits !== null &&
      bonusCredits !== null &&
      !Number.isSafeInteger(baseCredits + bonusCredits)
    ) {
      nextErrors.bonusCredits = "Tổng Credit vượt giới hạn an toàn.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const input = {
        packageCode: form.packageCode,
        name: form.name.trim(),
        priceVnd: priceVnd!,
        baseCredits: baseCredits!,
        bonusCredits: bonusCredits!,
        sortOrder: sortOrder!,
        version: item?.version,
      };
      if (item) await adminBillingApi.updatePackage(item.id, input);
      else await adminBillingApi.createPackage(input);
      onSaved();
    } catch (failure) {
      setConflict(isApiErrorCode(failure, "CONCURRENT_MODIFICATION"));
      setError(getErrorMessage(failure));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const total = (integer(form.baseCredits) ?? 0) + (integer(form.bonusCredits) ?? 0);
  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={saving}
      title={item ? "Chỉnh sửa gói Credit" : "Tạo gói Credit"}
      description={
        item
          ? "Các đơn đã tạo giữ nguyên giá và Credit ban đầu."
          : "Gói mới được lưu trữ; kích hoạt khi sẵn sàng bán."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mã gói" error={errors.packageCode}>
          <Input
            value={form.packageCode}
            disabled={!!item || saving}
            maxLength={50}
            onChange={(event) => update("packageCode", event.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Tên gói" error={errors.name}>
          <Input
            value={form.name}
            maxLength={100}
            disabled={saving}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["priceVnd", "Giá (VND)"],
              ["baseCredits", "Credit cơ bản"],
              ["bonusCredits", "Credit thưởng"],
              ["sortOrder", "Thứ tự hiển thị"],
            ] as const
          ).map(([field, label]) => (
            <Field key={field} label={label} error={errors[field]}>
              <Input
                inputMode="numeric"
                value={form[field]}
                disabled={saving}
                onChange={(event) => update(field, event.target.value)}
              />
            </Field>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Tổng nhận: {Number.isSafeInteger(total) ? credits(total) : "—"} Credit
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {conflict && (
          <p className="text-sm text-amber-700">
            Đóng form và tải lại danh sách để lấy phiên bản mới. Nội dung bạn nhập vẫn được giữ
            trong form này.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={conflict}>
            Lưu gói
          </Button>
        </div>
      </form>
    </Modal>
  );
}
