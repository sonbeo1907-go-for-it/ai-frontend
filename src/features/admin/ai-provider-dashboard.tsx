"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Network,
  Plus,
  RefreshCw,
  ServerCog,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageLoading } from "@/components/ui/states";
import { useToast } from "@/components/providers/toast-provider";
import {
  aiProviderApi,
  aiProviderConfigApi,
  getErrorMessage,
  isApiErrorCode,
} from "@/lib/api-client";
import type {
  AiProvider,
  AiProviderConfig,
  AiProviderConnectionTestResult,
  AiProviderCredential,
  AiPurpose,
} from "@/types/api";
import { ConfigCard, ProviderCard } from "./ai-provider-cards";
import { AiProviderConfigForm } from "./ai-provider-config-form";
import { AiProviderCredentialForm } from "./ai-provider-credential-form";
import { AiProviderForm } from "./ai-provider-form";
import { AI_PURPOSES, purposeDescriptions, purposeLabels } from "./ai-provider-labels";
import {
  connectionBlockReason,
  enabledCredentials,
  purposeReadiness,
  selectedCredential,
  usableCredentials,
} from "./ai-provider-readiness";

type DashboardTab = "providers" | "configurations";
type ArchiveTarget =
  | { kind: "provider"; provider: AiProvider }
  | { kind: "credential"; provider: AiProvider; credential: AiProviderCredential }
  | { kind: "configuration"; config: AiProviderConfig };

export function AiProviderDashboard() {
  const { show } = useToast();
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [configs, setConfigs] = useState<AiProviderConfig[]>([]);
  const [tab, setTab] = useState<DashboardTab>("providers");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<AiProvider | "create" | null>(null);
  const [configForm, setConfigForm] = useState<AiProviderConfig | "create" | null>(null);
  const [initialConfigPurpose, setInitialConfigPurpose] = useState<AiPurpose | undefined>();
  const [credentialForm, setCredentialForm] = useState<{
    provider: AiProvider;
    credential: AiProviderCredential | null;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
  const [testResult, setTestResult] = useState<AiProviderConnectionTestResult | null>(null);
  const [testResults, setTestResults] = useState<Record<string, AiProviderConnectionTestResult>>(
    {},
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [providerItems, configItems] = await Promise.all([
        aiProviderApi.list(),
        aiProviderConfigApi.list(),
      ]);
      setProviders(providerItems);
      setConfigs(configItems);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void Promise.all([aiProviderApi.list(), aiProviderConfigApi.list()])
      .then(([providerItems, configItems]) => {
        if (!active) return;
        setProviders(providerItems);
        setConfigs(configItems);
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const readinessByPurpose = useMemo(() => {
    return Object.fromEntries(
      AI_PURPOSES.map((purpose) => [
        purpose,
        purposeReadiness(purpose, configs, providers, testResults),
      ]),
    ) as Record<AiPurpose, ReturnType<typeof purposeReadiness>>;
  }, [configs, providers, testResults]);

  const summary = useMemo(() => {
    return {
      enabledProviders: providers.filter((provider) => provider.enabled).length,
      credentials: providers.reduce((total, provider) => total + provider.credentials.length, 0),
      usableCredentials: providers.reduce(
        (total, provider) => total + usableCredentials(provider).length,
        0,
      ),
      defaults: configs.filter((config) => config.defaultProvider).length,
      readyPurposes: AI_PURPOSES.filter((purpose) => readinessByPurpose[purpose].state === "READY")
        .length,
    };
  }, [providers, configs, readinessByPurpose]);

  const setupSteps = [
    {
      label: "Đăng ký provider",
      done: providers.length > 0,
      action: () => setProviderForm("create"),
    },
    {
      label: "Secret resolve thành công",
      done: summary.usableCredentials > 0,
      action: () => setTab("providers"),
    },
    {
      label: "Chọn model mặc định",
      done: summary.defaults > 0,
      action: () => setTab("configurations"),
    },
    {
      label: "Kiểm tra kết nối",
      done: Object.values(testResults).some((result) => result.success),
      action: () => setTab("configurations"),
    },
  ];

  function clearConnectionEvidence() {
    setTestResults({});
  }

  function openConfigCreate(purpose?: AiPurpose) {
    setInitialConfigPurpose(purpose);
    setConfigForm("create");
  }

  async function handleConcurrentModification() {
    setProviderForm(null);
    setCredentialForm(null);
    setConfigForm(null);
    clearConnectionEvidence();
    await load(false);
    show(
      "Dữ liệu đã được quản trị viên khác thay đổi. Phiên bản mới nhất đã được tải lại.",
      "error",
    );
  }

  async function handleActionError(error: unknown) {
    if (isApiErrorCode(error, "CONCURRENT_MODIFICATION")) {
      await handleConcurrentModification();
      return;
    }
    show(getErrorMessage(error), "error");
  }

  function upsertProvider(saved: AiProvider) {
    clearConnectionEvidence();
    setProviders((current) => [...current.filter((provider) => provider.id !== saved.id), saved]);
    setConfigs((current) =>
      current.map((config) =>
        config.providerId === saved.id
          ? {
              ...config,
              providerCode: saved.code,
              providerDisplayName: saved.displayName,
              baseUrl: saved.baseUrl,
              protocol: saved.protocol,
            }
          : config,
      ),
    );
  }

  function upsertCredential(providerId: string, saved: AiProviderCredential) {
    clearConnectionEvidence();
    setProviders((current) =>
      current.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              credentials: [
                ...provider.credentials.filter((credential) => credential.id !== saved.id),
                saved,
              ].sort((left, right) => right.priority - left.priority),
            }
          : provider,
      ),
    );
  }

  function upsertConfig(saved: AiProviderConfig) {
    clearConnectionEvidence();
    setConfigs((current) => {
      const others = current.filter((config) => config.id !== saved.id);
      const normalized = saved.defaultProvider
        ? others.map((config) =>
            config.purpose === saved.purpose ? { ...config, defaultProvider: false } : config,
          )
        : others;
      return [...normalized, saved];
    });
  }

  async function toggleProvider(provider: AiProvider) {
    setBusyAction(`provider:${provider.id}:toggle`);
    try {
      const saved = provider.enabled
        ? await aiProviderApi.disable(provider.id, provider.version)
        : await aiProviderApi.enable(provider.id, provider.version);
      upsertProvider(saved);
      show(provider.enabled ? "Đã tắt provider." : "Đã bật provider.");
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleCredential(provider: AiProvider, credential: AiProviderCredential) {
    setBusyAction(`credential:${credential.id}:toggle`);
    try {
      const saved = credential.enabled
        ? await aiProviderApi.disableCredential(provider.id, credential.id, credential.version)
        : await aiProviderApi.enableCredential(provider.id, credential.id, credential.version);
      upsertCredential(provider.id, saved);
      show(credential.enabled ? "Đã tắt credential." : "Đã bật credential.");
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleConfig(config: AiProviderConfig) {
    setBusyAction(`config:${config.id}:toggle`);
    try {
      const saved = config.enabled
        ? await aiProviderConfigApi.disable(config.id, config.version)
        : await aiProviderConfigApi.enable(config.id, config.version);
      upsertConfig(saved);
      show(config.enabled ? "Đã tắt cấu hình." : "Đã bật cấu hình.");
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function makeDefault(config: AiProviderConfig) {
    setBusyAction(`config:${config.id}:default`);
    try {
      upsertConfig(await aiProviderConfigApi.makeDefault(config.id, config.version));
      show(`Đã chọn ${config.model} làm mặc định cho ${purposeLabels[config.purpose]}.`);
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  async function testConnection(config: AiProviderConfig) {
    setBusyAction(`config:${config.id}:test`);
    try {
      const result = await aiProviderConfigApi.testConnection(config.id);
      setTestResult(result);
      setTestResults((current) => ({ ...current, [config.id]: result }));
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  function providerDisableReason(provider: AiProvider): string | null {
    const usedByDefault = configs.some(
      (config) => config.providerId === provider.id && config.defaultProvider,
    );
    return usedByDefault
      ? "Provider đang phục vụ cấu hình mặc định. Hãy chọn mặc định khác trước."
      : null;
  }

  function providerArchiveReason(provider: AiProvider): string | null {
    const count = configs.filter((config) => config.providerId === provider.id).length;
    return count > 0 ? `Provider còn ${count} model configuration. Hãy lưu trữ chúng trước.` : null;
  }

  function credentialLifecycleBlockReason(
    provider: AiProvider,
    credential: AiProviderCredential,
  ): string | null {
    const providerIsDefault = configs.some(
      (config) => config.providerId === provider.id && config.defaultProvider,
    );
    const isLastEnabledCredential = credential.enabled && enabledCredentials(provider).length <= 1;

    return providerIsDefault && isLastEnabledCredential
      ? "Credential cuối cùng của provider mặc định phải được giữ hoạt động."
      : null;
  }

  function defaultBlockReason(config: AiProviderConfig): string | null {
    const provider = providers.find((item) => item.id === config.providerId);
    if (!provider?.enabled) return "Hãy bật provider trước khi đặt làm mặc định.";
    if (enabledCredentials(provider).length === 0) {
      return "Provider cần ít nhất một credential đang bật.";
    }
    return null;
  }

  function archiveBlockReason(target: ArchiveTarget) {
    if (target.kind === "provider") {
      return providerArchiveReason(target.provider);
    }
    if (target.kind === "credential") {
      return credentialLifecycleBlockReason(target.provider, target.credential);
    }
    if (target.kind === "configuration" && target.config.defaultProvider) {
      return "Đây là cấu hình mặc định. Hãy chọn một cấu hình mặc định khác trước.";
    }
    return null;
  }

  function archiveTitle(target: ArchiveTarget) {
    if (target.kind === "provider") return target.provider.displayName;
    if (target.kind === "credential") return target.credential.label;
    return `${target.config.providerDisplayName} · ${target.config.model}`;
  }

  async function archive() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    const targetId =
      target.kind === "provider"
        ? target.provider.id
        : target.kind === "credential"
          ? target.credential.id
          : target.config.id;
    setBusyAction(`archive:${targetId}`);
    try {
      if (target.kind === "provider") {
        await aiProviderApi.archive(target.provider.id, target.provider.version);
        setProviders((current) => current.filter((provider) => provider.id !== target.provider.id));
      } else if (target.kind === "credential") {
        await aiProviderApi.archiveCredential(
          target.provider.id,
          target.credential.id,
          target.credential.version,
        );
        setProviders((current) =>
          current.map((provider) =>
            provider.id === target.provider.id
              ? {
                  ...provider,
                  credentials: provider.credentials.filter(
                    (credential) => credential.id !== target.credential.id,
                  ),
                }
              : provider,
          ),
        );
      } else {
        await aiProviderConfigApi.archive(target.config.id, target.config.version);
        setConfigs((current) => current.filter((config) => config.id !== target.config.id));
      }
      setArchiveTarget(null);
      show("Đã lưu trữ. Các tham chiếu lịch sử vẫn được bảo toàn.");
    } catch (error) {
      await handleActionError(error);
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) return <PageLoading label="Đang tải AI provider registry…" />;

  if (loadError) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="Không thể tải cấu hình AI"
        description={loadError}
        action={
          <Button onClick={() => void load()}>
            <RefreshCw className="size-4" /> Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Provider hoạt động
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {summary.enabledProviders}/{providers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">provider đã đăng ký</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Credential metadata
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{summary.credentials}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.usableCredentials} credential resolve được secret
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Purpose sẵn sàng
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {summary.readyPurposes}/{AI_PURPOSES.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">không tự động provider failover</p>
        </Card>
      </section>

      <Card className="mt-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">Thiết lập vận hành AI</p>
            <p className="mt-1 text-xs text-slate-500">
              Hoàn tất lần lượt provider, secret reference, model mặc định và kiểm tra kết nối.
            </p>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
            {setupSteps.map((step, index) => (
              <button
                key={step.label}
                type="button"
                onClick={step.done ? undefined : step.action}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  step.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full font-black ${
                    step.done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="size-4" /> : index + 1}
                </span>
                <span className="font-bold">{step.label}</span>
                {!step.done && <ArrowRight className="ml-auto size-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex w-fit rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("providers")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === "providers" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Network className="size-4" /> Providers
        </button>
        <button
          type="button"
          onClick={() => setTab("configurations")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === "configurations"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings2 className="size-4" /> Model configurations
        </button>
      </div>

      {tab === "providers" ? (
        <section className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                <ServerCog className="size-4" /> Provider registry
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-950">Nhà cung cấp AI</h2>
              <p className="mt-1 text-sm text-slate-500">
                Đăng ký endpoint, protocol và các secret reference độc lập.
              </p>
            </div>
            <Button onClick={() => setProviderForm("create")}>
              <Plus className="size-4" /> Thêm Provider
            </Button>
          </div>

          {providers.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Network}
                title="Chưa có AI provider"
                description="Đăng ký provider đầu tiên và khai báo secret reference trước khi tạo model configuration."
                action={<Button onClick={() => setProviderForm("create")}>Thêm Provider</Button>}
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {providers
                .slice()
                .sort((left, right) => left.code.localeCompare(right.code))
                .map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    configCount={
                      configs.filter((config) => config.providerId === provider.id).length
                    }
                    disableReason={providerDisableReason(provider)}
                    archiveReason={providerArchiveReason(provider)}
                    selectedCredentialId={selectedCredential(provider)?.id}
                    credentialBlockReason={(credential) =>
                      credentialLifecycleBlockReason(provider, credential)
                    }
                    busyAction={busyAction}
                    onEdit={() => setProviderForm(provider)}
                    onToggle={() => void toggleProvider(provider)}
                    onArchive={() => setArchiveTarget({ kind: "provider", provider })}
                    onAddCredential={() => setCredentialForm({ provider, credential: null })}
                    onEditCredential={(credential) => setCredentialForm({ provider, credential })}
                    onToggleCredential={(credential) => void toggleCredential(provider, credential)}
                    onArchiveCredential={(credential) =>
                      setArchiveTarget({ kind: "credential", provider, credential })
                    }
                  />
                ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                <Sparkles className="size-4" /> Purpose routing
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-950">Model configurations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mỗi purpose có tối đa một configuration mặc định đang hoạt động.
              </p>
            </div>
            <Button onClick={() => openConfigCreate()} disabled={summary.enabledProviders === 0}>
              <Plus className="size-4" /> Thêm configuration
            </Button>
          </div>

          <div className="mt-6 grid gap-8">
            {AI_PURPOSES.map((purpose: AiPurpose) => {
              const purposeConfigs = configs.filter((config) => config.purpose === purpose);
              const readiness = readinessByPurpose[purpose];
              return (
                <section key={purpose} aria-labelledby={`purpose-${purpose}`}>
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 id={`purpose-${purpose}`} className="text-sm font-black text-slate-900">
                        {purposeLabels[purpose]}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {purposeDescriptions[purpose]}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge tone={readiness.tone}>{readiness.label}</Badge>
                      <Badge tone={purposeConfigs.length ? "slate" : "amber"}>
                        {purposeConfigs.length
                          ? `${purposeConfigs.length} cấu hình`
                          : "Chưa cấu hình"}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openConfigCreate(purpose)}
                        disabled={summary.enabledProviders === 0}
                      >
                        <Plus className="size-3.5" /> Thêm
                      </Button>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-slate-500">{readiness.description}</p>
                  {purposeConfigs.length ? (
                    <div className="grid gap-3">
                      {purposeConfigs.map((config) => (
                        <ConfigCard
                          key={config.id}
                          config={config}
                          busyAction={busyAction}
                          onEdit={() => setConfigForm(config)}
                          onToggle={() => void toggleConfig(config)}
                          onDefault={() => void makeDefault(config)}
                          onTest={() => void testConnection(config)}
                          onArchive={() => setArchiveTarget({ kind: "configuration", config })}
                          testBlockReason={connectionBlockReason(config, providers)}
                          defaultBlockReason={defaultBlockReason(config)}
                          lastTestResult={testResults[config.id]}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed p-5 text-sm text-slate-500">
                      <p>Chưa có model configuration. Tác vụ AI tương ứng chưa thể chạy.</p>
                      <Button
                        className="mt-3"
                        variant="secondary"
                        size="sm"
                        onClick={() => openConfigCreate(purpose)}
                        disabled={summary.enabledProviders === 0}
                      >
                        <Plus className="size-3.5" /> Cấu hình {purposeLabels[purpose]}
                      </Button>
                    </Card>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {providerForm && (
        <AiProviderForm
          provider={providerForm === "create" ? null : providerForm}
          onClose={() => setProviderForm(null)}
          onSaved={(saved) => {
            upsertProvider(saved);
            setProviderForm(null);
            show("Đã lưu provider.");
          }}
          onConflict={() => void handleConcurrentModification()}
        />
      )}

      {credentialForm && (
        <AiProviderCredentialForm
          provider={credentialForm.provider}
          credential={credentialForm.credential}
          onClose={() => setCredentialForm(null)}
          onSaved={(saved) => {
            upsertCredential(credentialForm.provider.id, saved);
            setCredentialForm(null);
            show("Đã lưu credential metadata.");
          }}
          onConflict={() => void handleConcurrentModification()}
        />
      )}

      {configForm && (
        <AiProviderConfigForm
          config={configForm === "create" ? null : configForm}
          providers={providers}
          configs={configs}
          initialPurpose={configForm === "create" ? initialConfigPurpose : undefined}
          onClose={() => setConfigForm(null)}
          onSaved={(saved) => {
            upsertConfig(saved);
            setConfigForm(null);
            show("Đã lưu model configuration.");
          }}
          onConflict={() => void handleConcurrentModification()}
        />
      )}

      <Modal
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title="Lưu trữ tài nguyên?"
        description="Đây là soft archive; dữ liệu đã được tham chiếu không bị xóa cứng."
      >
        {archiveTarget && (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">{archiveTitle(archiveTarget)}</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                {archiveBlockReason(archiveTarget) ??
                  "Sau khi lưu trữ, tài nguyên sẽ không còn xuất hiện trong danh sách hoạt động."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setArchiveTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={() => void archive()}
                loading={busyAction?.startsWith("archive:")}
                disabled={archiveBlockReason(archiveTarget) !== null}
              >
                <Archive className="size-4" /> Xác nhận lưu trữ
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={testResult !== null}
        onClose={() => setTestResult(null)}
        title="Kết quả kiểm tra kết nối"
        description="Chỉ trạng thái và độ trễ được hiển thị; provider response content đã bị loại bỏ."
      >
        {testResult && (
          <div className="grid gap-5">
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                testResult.success
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 size-6 shrink-0 text-rose-600" />
              )}
              <div>
                <p className="font-black text-slate-950">
                  {testResult.success ? "Kết nối thành công" : "Kết nối thất bại"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{testResult.message}</p>
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-semibold text-slate-500">Provider / Model</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {testResult.providerCode} · {testResult.model}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-semibold text-slate-500">Độ trễ</dt>
                <dd className="mt-1 font-bold text-slate-900">{testResult.latencyMs} ms</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500">Credential được chọn</dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {testResult.credentialLabel ?? "Không có credential khả dụng"}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <Button onClick={() => setTestResult(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
