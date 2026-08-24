"use client";

import {
  Archive,
  Bot,
  CheckCircle2,
  CircleAlert,
  CircleOff,
  Gauge,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Star,
  TestTube2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AiProvider, AiProviderConfig, AiProviderCredential } from "@/types/api";
import type { AiProviderConnectionTestResult } from "@/types/api";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProviderCard({
  provider,
  configCount,
  disableReason,
  archiveReason,
  selectedCredentialId,
  credentialBlockReason,
  busyAction,
  onEdit,
  onToggle,
  onArchive,
  onAddCredential,
  onEditCredential,
  onToggleCredential,
  onArchiveCredential,
}: {
  provider: AiProvider;
  configCount: number;
  disableReason: string | null;
  archiveReason: string | null;
  selectedCredentialId?: string;
  credentialBlockReason: (credential: AiProviderCredential) => string | null;
  busyAction: string | null;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
  onAddCredential: () => void;
  onEditCredential: (credential: AiProviderCredential) => void;
  onToggleCredential: (credential: AiProviderCredential) => void;
  onArchiveCredential: (credential: AiProviderCredential) => void;
}) {
  const providerBusy = busyAction?.startsWith(`provider:${provider.id}:`) ?? false;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Bot className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-950">{provider.displayName}</h3>
                <Badge tone="indigo">{provider.code}</Badge>
                <Badge tone={provider.enabled ? "emerald" : "slate"}>
                  {provider.enabled ? "Đang bật" : "Đã tắt"}
                </Badge>
              </div>
              <p className="mt-1 break-all text-xs text-slate-500">{provider.baseUrl}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
              {provider.protocol.replaceAll("_", " ")}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
              Key strategy: {provider.credentialStrategy}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
              {configCount} model configuration
            </span>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="secondary" size="sm" onClick={onEdit} disabled={providerBusy}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              variant={provider.enabled ? "ghost" : "secondary"}
              size="sm"
              onClick={onToggle}
              disabled={providerBusy || (provider.enabled && disableReason !== null)}
              loading={busyAction === `provider:${provider.id}:toggle`}
            >
              {provider.enabled ? <CircleOff className="size-4" /> : <Power className="size-4" />}
              {provider.enabled ? "Tắt" : "Bật"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onArchive}
              disabled={providerBusy || archiveReason !== null}
            >
              <Archive className="size-4" /> Lưu trữ
            </Button>
          </div>
          {(disableReason || archiveReason) && (
            <p className="mt-2 max-w-sm text-right text-[11px] leading-4 text-amber-700">
              {disableReason ?? archiveReason}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">Credentials</h4>
          </div>
          <Button variant="secondary" size="sm" onClick={onAddCredential}>
            <Plus className="size-4" /> Thêm credential
          </Button>
        </div>

        {provider.credentials.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-800">
            Provider chưa có credential. Connection Test và tác vụ AI sẽ không thể chạy.
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {provider.credentials.map((credential) => {
              const credentialBusy =
                busyAction?.startsWith(`credential:${credential.id}:`) ?? false;
              const lifecycleBlockReason = credentialBlockReason(credential);
              const selected = selectedCredentialId === credential.id;
              return (
                <div
                  key={credential.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                      <KeyRound className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{credential.label}</p>
                        <Badge tone={credential.enabled ? "emerald" : "slate"}>
                          {credential.enabled ? "Bật" : "Tắt"}
                        </Badge>
                        <Badge tone="indigo">Priority {credential.priority}</Badge>
                        {selected && <Badge tone="emerald">Được chọn trước</Badge>}
                        {!credential.secretConfigured && (
                          <Badge tone="rose">Secret chưa cấu hình</Badge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {credential.secretRef} ·{" "}
                        {credential.secretConfigured
                          ? credential.maskedSecret
                          : "secret chưa resolve"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditCredential(credential)}
                      disabled={credentialBusy}
                    >
                      <Pencil className="size-3.5" /> Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleCredential(credential)}
                      loading={busyAction === `credential:${credential.id}:toggle`}
                      disabled={credentialBusy || lifecycleBlockReason !== null}
                    >
                      {credential.enabled ? "Tắt" : "Bật"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onArchiveCredential(credential)}
                      disabled={credentialBusy || lifecycleBlockReason !== null}
                      title={lifecycleBlockReason ?? "Lưu trữ credential"}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  </div>
                  {lifecycleBlockReason && (
                    <p className="text-[11px] leading-4 text-amber-700 sm:max-w-48 sm:text-right">
                      {lifecycleBlockReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ConfigCard({
  config,
  busyAction,
  onEdit,
  onToggle,
  onDefault,
  onTest,
  onArchive,
  testBlockReason,
  defaultBlockReason,
  lastTestResult,
}: {
  config: AiProviderConfig;
  busyAction: string | null;
  onEdit: () => void;
  onToggle: () => void;
  onDefault: () => void;
  onTest: () => void;
  onArchive: () => void;
  testBlockReason: string | null;
  defaultBlockReason: string | null;
  lastTestResult?: AiProviderConnectionTestResult;
}) {
  const busy = busyAction?.startsWith(`config:${config.id}:`) ?? false;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-slate-950">
              {config.providerDisplayName} · {config.model}
            </h3>
            <Badge tone="indigo">{config.providerCode}</Badge>
            {config.defaultProvider && <Badge tone="emerald">Mặc định</Badge>}
            <Badge tone={config.enabled ? "emerald" : "slate"}>
              {config.enabled ? "Đang bật" : "Đã tắt"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                <Gauge className="size-3.5" /> Timeout
              </dt>
              <dd className="mt-1 font-bold text-slate-800">{config.timeoutSeconds} giây</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="font-semibold text-slate-500">Token</dt>
              <dd className="mt-1 font-bold text-slate-800">
                {config.maxInputTokens.toLocaleString("vi-VN")} /{" "}
                {config.maxOutputTokens.toLocaleString("vi-VN")}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="font-semibold text-slate-500">Temperature</dt>
              <dd className="mt-1 font-bold text-slate-800">{config.temperature}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="font-semibold text-slate-500">Cập nhật</dt>
              <dd className="mt-1 font-bold text-slate-800">{formatUpdatedAt(config.updatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-80 lg:justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTest}
            loading={busyAction === `config:${config.id}:test`}
            disabled={busy || testBlockReason !== null}
            title={testBlockReason ?? "Kiểm tra kết nối"}
          >
            <TestTube2 className="size-4" /> Test
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit} disabled={busy}>
            <Pencil className="size-4" /> Sửa
          </Button>
          {!config.defaultProvider && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDefault}
              loading={busyAction === `config:${config.id}:default`}
              disabled={busy || defaultBlockReason !== null}
              title={defaultBlockReason ?? "Đặt làm mặc định"}
            >
              <Star className="size-4" /> Đặt mặc định
            </Button>
          )}
          <Button
            variant={config.enabled ? "ghost" : "secondary"}
            size="sm"
            onClick={onToggle}
            loading={busyAction === `config:${config.id}:toggle`}
            disabled={busy || config.defaultProvider}
            title={config.defaultProvider ? "Chọn cấu hình mặc định khác trước" : undefined}
          >
            {config.enabled ? <CircleOff className="size-4" /> : <Power className="size-4" />}
            {config.enabled ? "Tắt" : "Bật"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onArchive}
            disabled={busy || config.defaultProvider}
            title={
              config.defaultProvider
                ? "Chọn cấu hình mặc định khác trước khi lưu trữ"
                : "Lưu trữ cấu hình"
            }
          >
            <Archive className="size-4" />
          </Button>
        </div>
      </div>
      {(testBlockReason || defaultBlockReason) && (
        <p className="mt-3 text-xs text-amber-700">{testBlockReason ?? defaultBlockReason}</p>
      )}
      {lastTestResult && (
        <div
          className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
            lastTestResult.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {lastTestResult.success ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
          )}
          <div>
            <p className="font-bold">
              {lastTestResult.success
                ? `Kết nối thành công · ${lastTestResult.latencyMs} ms`
                : "Kiểm tra kết nối thất bại"}
            </p>
            <p className="mt-0.5 opacity-80">
              Kết quả gần nhất trong phiên trình duyệt này · {lastTestResult.message}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
