"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage } from "@/lib/api-client";
import type { AiPurpose, PageResponse } from "@/types/api";
import { AI_PURPOSES, purposeLabels } from "../ai-provider-labels";
import {
  adminBillingApi,
  type AdminCreditPackage,
  type AdminCreditRate,
  type CatalogStatus,
} from "./admin-billing-api";
import { credits, money } from "./billing-form-utils";
import { PackageForm } from "./package-form";
import { RateForm } from "./rate-form";
import { CreditAdjustmentForm } from "./credit-adjustment-form";

type CatalogItem = AdminCreditPackage | AdminCreditRate;
type Confirmation = { item: CatalogItem; status: CatalogStatus; current: AdminCreditRate | null };

export function AdminBillingDashboard({ actorId }: { actorId: string }) {
  const [tab, setTab] = useState<"packages" | "rates" | "adjustments">("packages");
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Quản trị Credit" className="flex flex-wrap gap-2">
        {(
          [
            ["packages", "Gói Credit"],
            ["rates", "Giá thao tác AI"],
            ["adjustments", "Điều chỉnh Credit"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "primary" : "secondary"}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "adjustments" ? (
        <CreditAdjustmentForm actorId={actorId} />
      ) : (
        <CatalogPanel key={tab} kind={tab} />
      )}
    </div>
  );
}

function CatalogPanel({ kind }: { kind: "packages" | "rates" }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<CatalogStatus | "">("");
  const [purpose, setPurpose] = useState<AiPurpose | "">("");
  const [data, setData] = useState<PageResponse<CatalogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<CatalogItem | "create" | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      setData(null);
      const request =
        kind === "packages"
          ? adminBillingApi.packages(page, status, controller.signal)
          : adminBillingApi.rates(page, status, purpose, controller.signal);
      request
        .then((value) => {
          if (active) setData(value);
        })
        .catch((failure) => {
          if (active) setError(getErrorMessage(failure));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [kind, page, status, purpose, revision]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  function saved() {
    setForm(null);
    setPage(0);
    setStatus("");
    setPurpose("");
    setNotice("Đã lưu thay đổi.");
    refresh();
  }

  async function prepareStatus(item: CatalogItem) {
    if (inFlight.current) return;
    const nextStatus = item.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "rates" && nextStatus === "ACTIVE") {
        const preview = await adminBillingApi.activationPreview(item.id);
        setConfirmation({ item: preview.selected, status: nextStatus, current: preview.current });
      } else {
        setConfirmation({ item, status: nextStatus, current: null });
      }
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function changeStatus() {
    if (!confirmation || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "packages") {
        await adminBillingApi.packageStatus(
          confirmation.item as AdminCreditPackage,
          confirmation.status,
        );
      } else {
        await adminBillingApi.rateStatus(
          confirmation.item as AdminCreditRate,
          confirmation.status,
          confirmation.current,
        );
      }
      setConfirmation(null);
      setNotice("Đã cập nhật trạng thái.");
      refresh();
    } catch (failure) {
      setConfirmation(null);
      setError(`${getErrorMessage(failure)} Tải lại danh sách trước khi thử lại.`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {kind === "packages" ? "Gói Credit" : "Giá thao tác AI"}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={refresh}>
            Tải lại
          </Button>
          <Button disabled={busy} onClick={() => setForm("create")}>
            {kind === "packages" ? "Tạo gói" : "Tạo giá"}
          </Button>
        </div>
      </header>
      <div className="my-5 flex flex-wrap gap-4">
        <Field label="Trạng thái">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CatalogStatus | "");
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </Select>
        </Field>
        {kind === "rates" && (
          <Field label="Mục đích AI">
            <Select
              value={purpose}
              onChange={(event) => {
                setPurpose(event.target.value as AiPurpose | "");
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {AI_PURPOSES.map((value) => (
                <option key={value} value={value}>
                  {purposeLabels[value]}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-8 text-slate-500">
          Đang tải danh sách…
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-3">{kind === "packages" ? "Gói" : "Mục đích / nhóm giá"}</th>
                <th className="py-3">
                  {kind === "packages" ? "Giá / Credit" : "Credit mỗi thao tác"}
                </th>
                <th className="py-3">Trạng thái</th>
                <th className="py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-4 pr-4">
                    {"packageCode" in item ? (
                      <>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.packageCode}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">{purposeLabels[item.purpose]}</p>
                        <p className="text-xs text-slate-500">
                          {item.modelCategory ?? "Giá mặc định"}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {"priceVnd" in item ? (
                      <>
                        <p>{money(item.priceVnd)}</p>
                        <p className="text-xs text-slate-500">
                          {credits(item.totalCredits)} Credit · thưởng {credits(item.bonusCredits)}
                        </p>
                      </>
                    ) : (
                      `${credits(item.creditCost)} Credit`
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={item.status === "ACTIVE" ? "text-emerald-700" : "text-slate-500"}
                    >
                      {item.status === "ACTIVE" ? "Đang áp dụng" : "Đã lưu trữ"}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setForm(item)}
                      >
                        {kind === "packages" ? "Sửa" : "Thay giá"}
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === "ACTIVE" ? "ghost" : "success"}
                        disabled={busy}
                        onClick={() => void prepareStatus(item)}
                      >
                        {item.status === "ACTIVE" ? "Lưu trữ" : "Kích hoạt"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.content.length && (
            <p className="py-8 text-center text-slate-500">Không có dữ liệu phù hợp.</p>
          )}
        </div>
      )}
      <footer className="mt-5 flex items-center justify-between gap-3 text-sm">
        <p>
          Trang {page + 1}
          {data ? ` / ${Math.max(1, data.totalPages)}` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={loading || busy || page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Trước
          </Button>
          <Button
            variant="secondary"
            disabled={loading || busy || !data || page + 1 >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sau
          </Button>
        </div>
      </footer>
      {form &&
        (kind === "packages" ? (
          <PackageForm
            item={form === "create" ? null : (form as AdminCreditPackage)}
            onClose={() => setForm(null)}
            onSaved={saved}
          />
        ) : (
          <RateForm
            item={form === "create" ? null : (form as AdminCreditRate)}
            onClose={() => setForm(null)}
            onSaved={saved}
          />
        ))}
      {confirmation && (
        <Modal
          open
          onClose={() => setConfirmation(null)}
          closeDisabled={busy}
          title={confirmation.status === "ACTIVE" ? "Kích hoạt" : "Lưu trữ"}
        >
          <div className="space-y-4 text-sm">
            <p>
              {"name" in confirmation.item
                ? confirmation.item.name
                : purposeLabels[confirmation.item.purpose]}
            </p>
            {confirmation.current && (
              <p>
                Thay giá {credits(confirmation.current.creditCost)} bằng{" "}
                {credits((confirmation.item as AdminCreditRate).creditCost)} Credit. Giá trước được
                lưu lịch sử.
              </p>
            )}
            {kind === "rates" && confirmation.status === "ARCHIVED" && (
              <p className="text-amber-700">
                Nếu không có giá mặc định thay thế, thao tác AI liên quan sẽ tạm thời không khả
                dụng.
              </p>
            )}
            {kind === "packages" && <p>Các đơn đã tạo không thay đổi.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>
                Hủy
              </Button>
              <Button loading={busy} onClick={() => void changeStatus()}>
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
