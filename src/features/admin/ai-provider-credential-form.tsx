"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { aiProviderApi, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { AiProvider, AiProviderCredential } from "@/types/api";

function normalizeSecretRef(value: string) {
  const separator = value.indexOf(":");
  if (separator < 0) return value.toLowerCase();
  return `${value.slice(0, separator).toLowerCase()}:${value.slice(separator + 1).toUpperCase()}`;
}

export function AiProviderCredentialForm({
  provider,
  credential,
  onClose,
  onSaved,
  onConflict,
}: {
  provider: AiProvider;
  credential: AiProviderCredential | null;
  onClose: () => void;
  onSaved: (credential: AiProviderCredential) => void;
  onConflict: () => void;
}) {
  const [label, setLabel] = useState(credential?.label ?? "");
  const [secretRef, setSecretRef] = useState(credential?.secretRef ?? "");
  const [priority, setPriority] = useState(String(credential?.priority ?? 100));
  const [enabled, setEnabled] = useState(credential?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      setError("Tên credential không được để trống.");
      return;
    }
    if (!/^env:[A-Z][A-Z0-9_]{2,127}$/.test(secretRef)) {
      setError("Secret reference phải có dạng env:VARIABLE_NAME.");
      return;
    }
    if (!Number.isInteger(Number(priority)) || Number(priority) < 0) {
      setError("Độ ưu tiên phải là số nguyên không âm.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = credential
        ? await aiProviderApi.updateCredential(provider.id, credential.id, {
            version: credential.version,
            label: label.trim(),
            secretRef,
            priority: Number(priority),
          })
        : await aiProviderApi.createCredential(provider.id, {
            label: label.trim(),
            secretRef,
            priority: Number(priority),
            enabled,
          });
      onSaved(saved);
    } catch (requestError) {
      if (isApiErrorCode(requestError, "CONCURRENT_MODIFICATION")) {
        onConflict();
        return;
      }
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      closeDisabled={saving}
      title={credential ? "Chỉnh sửa Credential" : `Thêm Credential cho ${provider.displayName}`}
    >
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Tên credential">
          <Input
            value={label}
            maxLength={100}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="VD: Production primary"
          />
        </Field>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-indigo-600" />
            <div className="min-w-0 flex-1">
              <Field label="Secret reference" hint="Định dạng: env:VARIABLE_NAME">
                <Input
                  value={secretRef}
                  maxLength={150}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setSecretRef(normalizeSecretRef(event.target.value))}
                  placeholder="env:OPENAI_API_KEY"
                />
              </Field>
            </div>
          </div>
        </div>
        <Field label="Độ ưu tiên" hint="Số cao hơn được chọn trước trong cùng provider.">
          <Input
            type="number"
            min={0}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          />
        </Field>
        {!credential && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-4 accent-slate-900"
            />
            <span className="text-sm font-bold text-slate-800">Bật credential sau khi tạo</span>
          </label>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            {credential ? "Lưu thay đổi" : "Thêm credential"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
