"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { aiProviderApi, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { AiProvider } from "@/types/api";
import { providerPresets } from "./ai-provider-labels";

type FormState = {
  code: string;
  displayName: string;
  baseUrl: string;
  protocol: "OPENAI_COMPATIBLE";
  credentialStrategy: "PRIORITY";
  enabled: boolean;
  addInitialCredential: boolean;
  credentialLabel: string;
  secretRef: string;
  credentialPriority: string;
};

function initialState(provider: AiProvider | null): FormState {
  if (provider) {
    return {
      code: provider.code,
      displayName: provider.displayName,
      baseUrl: provider.baseUrl,
      protocol: provider.protocol,
      credentialStrategy: provider.credentialStrategy,
      enabled: provider.enabled,
      addInitialCredential: false,
      credentialLabel: "",
      secretRef: "",
      credentialPriority: "100",
    };
  }

  return {
    code: "",
    displayName: "",
    baseUrl: "",
    protocol: "OPENAI_COMPATIBLE",
    credentialStrategy: "PRIORITY",
    enabled: true,
    addInitialCredential: true,
    credentialLabel: "Primary",
    secretRef: "",
    credentialPriority: "100",
  };
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function normalizeSecretRef(value: string) {
  const separator = value.indexOf(":");
  if (separator < 0) return value.toLowerCase();
  return `${value.slice(0, separator).toLowerCase()}:${value.slice(separator + 1).toUpperCase()}`;
}

export function AiProviderForm({
  provider,
  onClose,
  onSaved,
  onConflict,
}: {
  provider: AiProvider | null;
  onClose: () => void;
  onSaved: (provider: AiProvider) => void;
  onConflict: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(provider));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = provider !== null;

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCode(value: string) {
    const code = normalizeCode(value);
    const preset = providerPresets[code as keyof typeof providerPresets];
    setForm((current) => ({
      ...current,
      code,
      displayName: preset?.displayName ?? current.displayName,
      baseUrl: preset?.baseUrl ?? current.baseUrl,
      secretRef: preset?.secretRef ?? current.secretRef,
    }));
  }

  function validate() {
    if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(form.code)) {
      return "Mã provider phải bắt đầu bằng chữ và chỉ chứa chữ hoa, số hoặc dấu gạch dưới.";
    }
    if (!form.displayName.trim()) return "Tên hiển thị không được để trống.";
    if (!form.baseUrl.trim().startsWith("https://")) {
      return "Base URL phải sử dụng HTTPS.";
    }
    if (!editing && form.addInitialCredential) {
      if (!form.credentialLabel.trim()) return "Tên credential không được để trống.";
      if (!/^env:[A-Z][A-Z0-9_]{2,127}$/.test(form.secretRef)) {
        return "Secret reference phải có dạng env:VARIABLE_NAME.";
      }
      const priority = Number(form.credentialPriority);
      if (!Number.isInteger(priority) || priority < 0) {
        return "Độ ưu tiên credential phải là số nguyên không âm.";
      }
    }
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = provider
        ? await aiProviderApi.update(provider.id, {
            version: provider.version,
            displayName: form.displayName.trim(),
            baseUrl: form.baseUrl.trim(),
            protocol: form.protocol,
            credentialStrategy: form.credentialStrategy,
          })
        : await aiProviderApi.create({
            code: form.code,
            displayName: form.displayName.trim(),
            baseUrl: form.baseUrl.trim(),
            protocol: form.protocol,
            credentialStrategy: form.credentialStrategy,
            enabled: form.enabled,
            initialCredential: form.addInitialCredential
              ? {
                  label: form.credentialLabel.trim(),
                  secretRef: form.secretRef,
                  priority: Number(form.credentialPriority),
                  enabled: true,
                }
              : undefined,
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
      onClose={saving ? () => undefined : onClose}
      title={editing ? "Chỉnh sửa Nhà cung cấp AI" : "Thêm Nhà cung cấp AI (Provider)"}
      description={
        editing
          ? "Mã provider là định danh bất biến và không thể chỉnh sửa."
          : "Đăng ký provider tương thích OpenAI để sử dụng trong các cấu hình AI."
      }
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="grid gap-5">
        <Field
          label="Mã Provider (Code)"
          hint="Chỉ chứa chữ cái viết hoa, số và dấu gạch dưới. Không thể sửa sau khi tạo."
        >
          <Input
            value={form.code}
            disabled={editing}
            maxLength={50}
            onChange={(event) => updateCode(event.target.value)}
            placeholder="VD: OPENAI, DEEPSEEK, PRIVATE_GATEWAY"
          />
        </Field>

        <Field label="Tên hiển thị">
          <Input
            value={form.displayName}
            maxLength={120}
            onChange={(event) => update("displayName", event.target.value)}
            placeholder="VD: OpenAI, DeepSeek AI"
          />
        </Field>

        <Field
          label="Base URL Endpoint (HTTPS)"
          hint="Nhập API root; hệ thống sẽ gọi endpoint /chat/completions."
        >
          <Input
            type="url"
            value={form.baseUrl}
            maxLength={500}
            onChange={(event) => update("baseUrl", event.target.value)}
            placeholder="https://api.deepseek.com/v1"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Giao thức API (Protocol)">
            <Select value={form.protocol} disabled>
              <option value="OPENAI_COMPATIBLE">OpenAI Compatible</option>
            </Select>
          </Field>
          <Field label="Chiến lược chọn Key">
            <Select value={form.credentialStrategy} disabled>
              <option value="PRIORITY">PRIORITY — ưu tiên số cao nhất</option>
            </Select>
          </Field>
        </div>

        {!editing && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.addInitialCredential}
                onChange={(event) => update("addInitialCredential", event.target.checked)}
                className="size-4 accent-indigo-600"
              />
              <span className="text-sm font-bold text-indigo-950">Thêm credential ban đầu</span>
            </label>

            {form.addInitialCredential && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.5fr_8rem]">
                <Field label="Tên credential">
                  <Input
                    value={form.credentialLabel}
                    maxLength={100}
                    onChange={(event) => update("credentialLabel", event.target.value)}
                    placeholder="Primary"
                  />
                </Field>
                <Field label="Secret reference" hint="Không nhập API key thực tế.">
                  <Input
                    value={form.secretRef}
                    maxLength={150}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                      update("secretRef", normalizeSecretRef(event.target.value))
                    }
                    placeholder="env:DEEPSEEK_API_KEY"
                  />
                </Field>
                <Field label="Độ ưu tiên">
                  <Input
                    type="number"
                    min={0}
                    value={form.credentialPriority}
                    onChange={(event) => update("credentialPriority", event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {!editing && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
              className="mt-1 size-4 accent-slate-900"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Bật provider sau khi tạo
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Provider vẫn cần model configuration trước khi phục vụ tác vụ AI.
              </span>
            </span>
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

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-emerald-600" />
            <KeyRound className="size-4 text-indigo-600" />
            Raw API key không đi qua business API.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Lưu thay đổi" : "Thêm Provider"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
