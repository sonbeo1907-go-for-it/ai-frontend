import type {
  AiProvider,
  AiProviderConfig,
  AiProviderCredential,
  AiProviderConnectionTestResult,
  ApiErrorBody,
  ApiResponse,
  CreateAiProviderCredentialInput,
  CreateAiProviderConfigInput,
  CreateAiProviderInput,
  ProfileResponse,
  TokenResponse,
  UpdateAiProviderCredentialInput,
  UpdateAiProviderConfigInput,
  UpdateAiProviderInput,
} from "@/types/api";

let accessToken: string | null = null;
let refreshPromise: Promise<TokenResponse> | null = null;

export class ApiClientError extends Error {
  constructor(public readonly details: ApiErrorBody) {
    super(details.message);
    this.name = "ApiClientError";
  }
}
export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function parseError(response: Response): Promise<ApiErrorBody> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return {
      status: response.status,
      code: body.code ?? "REQUEST_FAILED",
      message: body.message ?? "Yêu cầu không thể hoàn tất.",
      ...body,
    } as ApiErrorBody;
  } catch {
    return {
      status: response.status,
      code: "REQUEST_FAILED",
      message: "Không thể kết nối tới máy chủ.",
    };
  }
}
async function refreshAccessToken(): Promise<TokenResponse> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new ApiClientError(await parseError(response));
        const payload = (await response.json()) as ApiResponse<TokenResponse>;
        setAccessToken(payload.data.accessToken);
        return payload.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401 && retry && !path.includes("/auth/")) {
    try {
      await refreshAccessToken();
      return apiRequest<T>(path, init, false);
    } catch {
      setAccessToken(null);
    }
  }
  if (!response.ok) throw new ApiClientError(await parseError(response));
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body) return undefined as T;
  const payload = JSON.parse(body) as ApiResponse<T>;
  return payload.data;
}
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<TokenResponse>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    ),
  google: (idToken: string) =>
    apiRequest<TokenResponse>(
      "/api/v1/auth/google",
      { method: "POST", body: JSON.stringify({ idToken }) },
      false,
    ),
  register: (email: string, password: string, displayName: string) =>
    apiRequest<void>(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, displayName }) },
      false,
    ),
  refresh: refreshAccessToken,
  profile: () => apiRequest<ProfileResponse>("/api/v1/profile"),
  logout: async () => {
    const headers = new Headers();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    await fetch("/api/v1/auth/logout", { method: "POST", headers, credentials: "include" });
    setAccessToken(null);
  },
};

const AI_PROVIDER_CONFIGS_PATH = "/api/v1/admin/ai-provider-configs";
const AI_PROVIDERS_PATH = "/api/v1/admin/ai-providers";

function configPath(configId: string) {
  return `${AI_PROVIDER_CONFIGS_PATH}/${configId}`;
}

function providerPath(providerId: string) {
  return `${AI_PROVIDERS_PATH}/${providerId}`;
}

function credentialPath(providerId: string, credentialId: string) {
  return `${providerPath(providerId)}/credentials/${credentialId}`;
}

export const aiProviderApi = {
  list: () => apiRequest<AiProvider[]>(AI_PROVIDERS_PATH),
  get: (providerId: string) => apiRequest<AiProvider>(providerPath(providerId)),
  create: (input: CreateAiProviderInput) =>
    apiRequest<AiProvider>(AI_PROVIDERS_PATH, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (providerId: string, input: UpdateAiProviderInput) =>
    apiRequest<AiProvider>(providerPath(providerId), {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  enable: (providerId: string, version: number) =>
    apiRequest<AiProvider>(`${providerPath(providerId)}/enable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  disable: (providerId: string, version: number) =>
    apiRequest<AiProvider>(`${providerPath(providerId)}/disable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  archive: (providerId: string, version: number) =>
    apiRequest<void>(`${providerPath(providerId)}?version=${encodeURIComponent(version)}`, {
      method: "DELETE",
    }),
  listCredentials: (providerId: string) =>
    apiRequest<AiProviderCredential[]>(`${providerPath(providerId)}/credentials`),
  createCredential: (providerId: string, input: CreateAiProviderCredentialInput) =>
    apiRequest<AiProviderCredential>(`${providerPath(providerId)}/credentials`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCredential: (
    providerId: string,
    credentialId: string,
    input: UpdateAiProviderCredentialInput,
  ) =>
    apiRequest<AiProviderCredential>(credentialPath(providerId, credentialId), {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  enableCredential: (providerId: string, credentialId: string, version: number) =>
    apiRequest<AiProviderCredential>(`${credentialPath(providerId, credentialId)}/enable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  disableCredential: (providerId: string, credentialId: string, version: number) =>
    apiRequest<AiProviderCredential>(`${credentialPath(providerId, credentialId)}/disable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  archiveCredential: (providerId: string, credentialId: string, version: number) =>
    apiRequest<void>(
      `${credentialPath(providerId, credentialId)}?version=${encodeURIComponent(version)}`,
      { method: "DELETE" },
    ),
};

export const aiProviderConfigApi = {
  list: () => apiRequest<AiProviderConfig[]>(AI_PROVIDER_CONFIGS_PATH),
  get: (configId: string) => apiRequest<AiProviderConfig>(configPath(configId)),
  create: (input: CreateAiProviderConfigInput) =>
    apiRequest<AiProviderConfig>(AI_PROVIDER_CONFIGS_PATH, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (configId: string, input: UpdateAiProviderConfigInput) =>
    apiRequest<AiProviderConfig>(configPath(configId), {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  enable: (configId: string, version: number) =>
    apiRequest<AiProviderConfig>(`${configPath(configId)}/enable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  disable: (configId: string, version: number) =>
    apiRequest<AiProviderConfig>(`${configPath(configId)}/disable`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  makeDefault: (configId: string, version: number) =>
    apiRequest<AiProviderConfig>(`${configPath(configId)}/default`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  testConnection: (configId: string) =>
    apiRequest<AiProviderConnectionTestResult>(`${configPath(configId)}/test-connection`, {
      method: "POST",
    }),
  archive: (configId: string, version: number) =>
    apiRequest<void>(`${configPath(configId)}?version=${encodeURIComponent(version)}`, {
      method: "DELETE",
    }),
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const first = error.details.violations?.[0];
    return first ? `${first.field}: ${first.message}` : error.message;
  }
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

export function isApiErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiClientError && error.details.code === code;
}
