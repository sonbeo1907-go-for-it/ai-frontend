"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { aiProviderConfigApi, getErrorMessage, isApiErrorCode } from "@/lib/api-client";
import type { AiProvider, AiProviderConfig, AiPurpose } from "@/types/api";
import { AI_PURPOSES, purposeLabels } from "./ai-provider-labels";

type FormState = {
  providerId: string;
  purpose: AiPurpose;
  model: string;
  timeoutSeconds: string;
  maxInputTokens: string;
  maxOutputTokens: string;
  temperature: string;
  enabled: boolean;
  defaultProvider: boolean;
};

function initialState(
  config: AiProviderConfig | null,
  providers: AiProvider[],
  configs: AiProviderConfig[],
  initialPurpose?: AiPurpose,
): FormState {
  if (config) {
    return {
      providerId: config.providerId,
      purpose: config.purpose,
      model: config.model,
      timeoutSeconds: String(config.timeoutSeconds),
      maxInputTokens: String(config.maxInputTokens),
      maxOutputTokens: String(config.maxOutputTokens),
      temperature: String(config.temperature),
      enabled: config.enabled,
      defaultProvider: config.defaultProvider,
    };
  }

  const purpose = initialPurpose ?? "ROADMAP_GENERATION";
  const purposeHasDefault = configs.some(
    (item) => item.purpose === purpose && item.defaultProvider,
  );

  return {
    providerId: providers.find((provider) => provider.enabled)?.id ?? "",
    purpose,
    model: "",
    timeoutSeconds: "30",
    maxInputTokens: "16000",
    maxOutputTokens: "4000",
    temperature: "0.2",
    enabled: true,
    defaultProvider: !purposeHasDefault,
  };
}

export function AiProviderConfigForm({
  config,
  providers,
  configs,
  initialPurpose,
  onClose,
  onSaved,
  onConflict,
}: {
  config: AiProviderConfig | null;
  providers: AiProvider[];
  configs: AiProviderConfig[];
  initialPurpose?: AiPurpose;
  onClose: () => void;
  onSaved: (config: AiProviderConfig) => void;
  onConflict: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    initialState(config, providers, configs, initialPurpose),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = config !== null;
  const purposeHasDefault = configs.some(
    (item) => item.purpose === form.purpose && item.defaultProvider,
  );
  const mustBeDefault = !editing && form.enabled && !purposeHasDefault;

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.providerId) return "Hãy đăng ký provider trước khi tạo cấu hình.";
    const selectedProvider = providers.find((provider) => provider.id === form.providerId);
    if (!editing && !selectedProvider?.enabled) {
      return "Hãy bật provider đã chọn trước khi tạo cấu hình.";
    }
    const willBeDefault = mustBeDefault || form.defaultProvider;
    if (
      !editing &&
      willBeDefault &&
      !selectedProvider?.credentials.some((credential) => credential.enabled)
    ) {
      return "Provider cần ít nhất một credential đang bật trước khi làm mặc định.";
    }
    if (!form.model.trim()) return "Model không được để trống.";

    const timeout = Number(form.timeoutSeconds);
    const inputTokens = Number(form.maxInputTokens);
    const outputTokens = Number(form.maxOutputTokens);
    const temperature = Number(form.temperature);

    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120) {
      return "Timeout phải là số nguyên từ 1 đến 120 giây.";
    }
    if (!Number.isInteger(inputTokens) || inputTokens < 1) {
      return "Input token phải là số nguyên dương.";
    }
    if (!Number.isInteger(outputTokens) || outputTokens < 1) {
      return "Output token phải là số nguyên dương.";
    }
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      return "Temperature phải nằm trong khoảng 0 đến 2.";
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
    const common = {
      model: form.model.trim(),
      timeoutSeconds: Number(form.timeoutSeconds),
      maxInputTokens: Number(form.maxInputTokens),
      maxOutputTokens: Number(form.maxOutputTokens),
      temperature: Number(form.temperature),
    };

    try {
      const saved = config
        ? await aiProviderConfigApi.update(config.id, {
            version: config.version,
            ...common,
          })
        : await aiProviderConfigApi.create({
            providerId: form.providerId,
            purpose: form.purpose,
            enabled: form.enabled,
            defaultProvider: mustBeDefault || form.defaultProvider,
            ...common,
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
      title={editing ? "Chỉnh sửa Model Configuration" : "Thêm Model Configuration"}
      description="Gắn một model của provider vào đúng mục đích AI trong hệ thống."
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Provider">
            <Select
              value={form.providerId}
              disabled={editing}
              onChange={(event) => update("providerId", event.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id} disabled={!provider.enabled}>
                  {provider.displayName} ({provider.code}){provider.enabled ? "" : " — đã tắt"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mục đích sử dụng">
            <Select
              value={form.purpose}
              disabled={editing}
              onChange={(event) => {
                const purpose = event.target.value as AiPurpose;
                const hasDefault = configs.some(
                  (item) => item.purpose === purpose && item.defaultProvider,
                );
                setForm((current) => ({
                  ...current,
                  purpose,
                  defaultProvider: current.enabled && !hasDefault,
                }));
              }}
            >
              {AI_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purposeLabels[purpose]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Model">
          <Input
            value={form.model}
            maxLength={150}
            onChange={(event) => update("model", event.target.value)}
            placeholder="VD: gpt-4.1-mini, deepseek-chat"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Timeout (giây)">
            <Input
              type="number"
              min={1}
              max={120}
              value={form.timeoutSeconds}
              onChange={(event) => update("timeoutSeconds", event.target.value)}
            />
          </Field>
          <Field label="Input token tối đa">
            <Input
              type="number"
              min={1}
              value={form.maxInputTokens}
              onChange={(event) => update("maxInputTokens", event.target.value)}
            />
          </Field>
          <Field label="Output token tối đa">
            <Input
              type="number"
              min={1}
              value={form.maxOutputTokens}
              onChange={(event) => update("maxOutputTokens", event.target.value)}
            />
          </Field>
          <Field label="Temperature">
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(event) => update("temperature", event.target.value)}
            />
          </Field>
        </div>

        {!editing && (
          <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    enabled: event.target.checked,
                    defaultProvider: event.target.checked
                      ? !purposeHasDefault || current.defaultProvider
                      : false,
                  }))
                }
                className="mt-1 size-4 accent-slate-900"
              />
              <span className="text-sm font-bold text-slate-800">Bật cấu hình</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={mustBeDefault || form.defaultProvider}
                disabled={!form.enabled || mustBeDefault}
                onChange={(event) => update("defaultProvider", event.target.checked)}
                className="mt-1 size-4 accent-slate-900"
              />
              <span className="text-sm font-bold text-slate-800">
                Đặt làm mặc định cho mục đích này
              </span>
            </label>
          </div>
        )}

        {mustBeDefault && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <p className="font-bold">Cấu hình mặc định bắt buộc</p>
            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Đây là cấu hình hoạt động đầu tiên cho mục đích này, nên hệ thống sẽ đặt nó làm mặc
              định.
            </p>
          </div>
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
            {editing ? "Lưu thay đổi" : "Tạo cấu hình"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
