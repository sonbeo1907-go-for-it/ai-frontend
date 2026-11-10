"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import {
  adminBillingApi,
  type AdjustmentInput,
  type AdjustmentResult,
  type AdminWallet,
} from "./admin-billing-api";
import { credits, integer } from "./billing-form-utils";

type PendingAdjustment = { userId: string; key: string; input: AdjustmentInput };

export function CreditAdjustmentForm({ actorId }: { actorId: string }) {
  const [account, setAccount] = useState("");
  const [wallet, setWallet] = useState<AdminWallet | null>(null);
  const [direction, setDirection] = useState<"ADD" | "DEDUCT">("ADD");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [pending, setPending] = useState<PendingAdjustment | null>(null);
  const [result, setResult] = useState<AdjustmentResult | null>(null);
  const inFlight = useRef(false);
  const pendingRef = useRef<PendingAdjustment | null>(null);
  const storageKey = `admin-billing-adjustment:${actorId}`;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(storageKey);
        if (!saved) return;
        const restored: PendingAdjustment = JSON.parse(saved);
        if (
          !restored.userId ||
          !restored.key ||
          !restored.input ||
          !Number.isSafeInteger(restored.input.delta)
        )
          return;
        pendingRef.current = restored;
        setPending(restored);
        setAmount(String(Math.abs(restored.input.delta)));
        setDirection(restored.input.delta > 0 ? "ADD" : "DEDUCT");
        setReason(restored.input.reason);
        setError("Có yêu cầu chưa xác nhận. Kiểm tra lại cùng yêu cầu, không tạo điều chỉnh mới.");
        void adminBillingApi
          .wallet(restored.userId)
          .then((value) => {
            if (active) setWallet(value);
          })
          .catch(() => {
            if (active) setError("Chưa tải được ví. Bạn vẫn có thể kiểm tra lại yêu cầu đang chờ.");
          });
      } catch {
        setError(
          "Không đọc được thông tin phục hồi. Vui lòng kiểm tra lịch sử trước khi điều chỉnh.",
        );
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storageKey]);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || pendingRef.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setWallet(null);
    setResult(null);
    try {
      setWallet(await adminBillingApi.lookup(account.trim()));
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const parsedAmount = integer(amount, 1);
  const delta = parsedAmount === null ? 0 : direction === "ADD" ? parsedAmount : -parsedAmount;
  const after = wallet ? wallet.availableCredits + delta : 0;
  const valid =
    parsedAmount !== null &&
    !!reason.trim() &&
    !/\p{Cc}/u.test(reason) &&
    Number.isSafeInteger(after) &&
    after >= 0;

  function prepare(event: FormEvent) {
    event.preventDefault();
    if (!valid || !wallet || pendingRef.current) {
      setError("Kiểm tra số Credit, số dư sau điều chỉnh và lý do.");
      return;
    }
    setError("");
    setConfirmation(true);
  }

  async function adjust() {
    if (inFlight.current) return;
    const request =
      pendingRef.current ??
      (wallet && valid
        ? {
            userId: wallet.userId,
            key: crypto.randomUUID(),
            input: { delta, reason: reason.trim(), version: wallet.version },
          }
        : null);
    if (!request) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      // Save the immutable request before sending, including for reload recovery.
      window.sessionStorage.setItem(storageKey, JSON.stringify(request));
      pendingRef.current = request;
      setPending(request);
      const receipt = await adminBillingApi.adjust(request.userId, request.key, request.input);
      setResult(receipt);
      pendingRef.current = null;
      setPending(null);
      window.sessionStorage.removeItem(storageKey);
      setConfirmation(false);
      setAmount("");
      setReason("");
      try {
        setWallet(await adminBillingApi.wallet(request.userId));
      } catch {
        setWallet(null);
        setError("Điều chỉnh đã được ghi nhận. Hãy tìm lại tài khoản để tải số dư mới.");
      }
    } catch (failure) {
      const definitiveRejection =
        failure instanceof ApiClientError &&
        [400, 401, 403, 404, 409, 422].includes(failure.details.status);
      if (definitiveRejection) {
        pendingRef.current = null;
        setPending(null);
        window.sessionStorage.removeItem(storageKey);
        setConfirmation(false);
        setWallet(null);
        setError(`${getErrorMessage(failure)} Hãy tìm lại tài khoản để kiểm tra dữ liệu mới.`);
      } else {
        setError(
          "Chưa biết yêu cầu đã được ghi nhận hay chưa. Kiểm tra lại cùng yêu cầu để tránh cộng/trừ hai lần.",
        );
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold">Điều chỉnh Credit</h2>
      <form onSubmit={lookup} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Field label="Email hoặc mã tài khoản USER">
            <Input
              value={account}
              maxLength={254}
              disabled={busy || !!pending}
              onChange={(event) => setAccount(event.target.value)}
            />
          </Field>
        </div>
        <Button
          type="submit"
          loading={busy && !confirmation}
          disabled={!!pending || !account.trim()}
        >
          Tìm tài khoản
        </Button>
      </form>
      {wallet && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-bold">{wallet.email}</p>
          <p className="mt-1">
            Khả dụng: {credits(wallet.availableCredits)} · Giữ chỗ:{" "}
            {credits(wallet.reservedCredits)} Credit
          </p>
          {!wallet.initialized && (
            <p className="mt-2 text-amber-700">
              Ví chưa khởi tạo. Số dư dự kiến bao gồm Credit chào mừng sẽ được cấp khi điều chỉnh.
            </p>
          )}
        </div>
      )}
      {wallet && !pending && (
        <form onSubmit={prepare} className="mt-5 space-y-4">
          <fieldset className="flex gap-5" disabled={busy}>
            <legend className="mb-2 text-sm font-bold">Loại điều chỉnh</legend>
            {(
              [
                ["ADD", "Cộng Credit"],
                ["DEDUCT", "Trừ Credit"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="direction"
                  checked={direction === value}
                  onChange={() => setDirection(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <Field label="Số Credit">
            <Input
              inputMode="numeric"
              value={amount}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Lý do" hint="Không nhập mật khẩu, khóa API hoặc nội dung học tập riêng tư.">
            <Textarea
              value={reason}
              maxLength={200}
              rows={3}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <p className="text-sm">
            Sau điều chỉnh: <strong>{Number.isSafeInteger(after) ? credits(after) : "—"}</strong>{" "}
            Credit khả dụng
          </p>
          <Button type="submit" disabled={!valid || busy}>
            Kiểm tra và xác nhận
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      {pending && (
        <Button className="mt-4" loading={busy} onClick={() => void adjust()}>
          Kiểm tra lại yêu cầu đang chờ
        </Button>
      )}
      {result && (
        <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-bold">
            {result.replayed
              ? "Yêu cầu này đã được ghi nhận trước đó; không điều chỉnh thêm."
              : "Đã ghi nhận điều chỉnh Credit."}
          </p>
          <p>Mã giao dịch: {result.ledgerEntryId}</p>
          <p>Số dư sau giao dịch: {credits(result.availableCredits)} Credit</p>
        </div>
      )}
      {confirmation && wallet && (
        <Modal
          open
          onClose={() => setConfirmation(false)}
          closeDisabled={busy}
          title="Xác nhận điều chỉnh Credit"
          description="Kiểm tra tài khoản, số Credit và lý do trước khi xác nhận."
        >
          <div className="space-y-3 text-sm">
            <p className="font-bold">{wallet.email}</p>
            <p>
              {delta > 0 ? "Cộng" : "Trừ"} {credits(Math.abs(delta))} Credit · Số dư dự kiến:{" "}
              {credits(after)}
            </p>
            <p className="whitespace-pre-wrap break-words">{reason.trim()}</p>
            {error && (
              <p role="alert" className="text-rose-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmation(false)}>
                Hủy
              </Button>
              <Button loading={busy} onClick={() => void adjust()}>
                {pending ? "Kiểm tra lại cùng yêu cầu" : "Xác nhận điều chỉnh"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
