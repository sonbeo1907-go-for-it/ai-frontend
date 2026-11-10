import type {
  AiProvider,
  AiProviderConfig,
  AiProviderConnectionTestResult,
  AiProviderCredential,
  AiPurpose,
} from "@/types/api";

export type PurposeReadinessState =
  | "NOT_CONFIGURED"
  | "PROVIDER_DISABLED"
  | "SECRET_MISSING"
  | "READY_TO_TEST"
  | "CONNECTION_FAILED"
  | "READY";

export type PurposeReadiness = {
  state: PurposeReadinessState;
  label: string;
  description: string;
  tone: "slate" | "emerald" | "amber" | "rose";
  defaultConfig?: AiProviderConfig;
  provider?: AiProvider;
};

export function enabledCredentials(provider: AiProvider): AiProviderCredential[] {
  return provider.credentials.filter((credential) => credential.enabled);
}

export function usableCredentials(provider: AiProvider): AiProviderCredential[] {
  return enabledCredentials(provider).filter((credential) => credential.secretConfigured);
}

export function selectedCredential(provider: AiProvider): AiProviderCredential | undefined {
  return usableCredentials(provider)
    .slice()
    .sort((left, right) => {
      if (left.priority !== right.priority) return right.priority - left.priority;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })[0];
}

export function connectionBlockReason(
  config: AiProviderConfig,
  providers: AiProvider[],
): string | null {
  const provider = providers.find((item) => item.id === config.providerId);
  if (!provider) return "Provider của cấu hình không còn khả dụng.";
  if (!provider.enabled) return "Hãy bật provider trước khi kiểm tra kết nối.";
  if (usableCredentials(provider).length === 0) {
    return "Provider cần ít nhất một credential đang bật và resolve được secret.";
  }
  return null;
}

export function purposeReadiness(
  purpose: AiPurpose,
  configs: AiProviderConfig[],
  providers: AiProvider[],
  testResults: Record<string, AiProviderConnectionTestResult>,
): PurposeReadiness {
  const defaultConfig = configs.find(
    (config) => config.purpose === purpose && config.defaultProvider,
  );

  if (!defaultConfig) {
    return {
      state: "NOT_CONFIGURED",
      label: "Chưa cấu hình",
      description: "Chưa có model mặc định cho mục đích này.",
      tone: "amber",
    };
  }

  const provider = providers.find((item) => item.id === defaultConfig.providerId);
  if (!defaultConfig.enabled || !provider?.enabled) {
    return {
      state: "PROVIDER_DISABLED",
      label: "Đang tắt",
      description: "Cấu hình mặc định hoặc provider đang bị tắt.",
      tone: "slate",
      defaultConfig,
      provider,
    };
  }

  if (usableCredentials(provider).length === 0) {
    return {
      state: "SECRET_MISSING",
      label: "Thiếu secret",
      description: "Không có credential đang bật nào resolve được secret.",
      tone: "rose",
      defaultConfig,
      provider,
    };
  }

  const latestTest = testResults[defaultConfig.id];
  if (!latestTest) {
    return {
      state: "READY_TO_TEST",
      label: "Cần kiểm tra",
      description: "Đã đủ cấu hình. Hãy chạy Test Connection.",
      tone: "amber",
      defaultConfig,
      provider,
    };
  }

  if (!latestTest.success) {
    return {
      state: "CONNECTION_FAILED",
      label: "Kiểm tra thất bại",
      description: latestTest.message,
      tone: "rose",
      defaultConfig,
      provider,
    };
  }

  return {
    state: "READY",
    label: "Sẵn sàng",
    description: `Kết nối thành công trong ${latestTest.latencyMs} ms.`,
    tone: "emerald",
    defaultConfig,
    provider,
  };
}
