import type { ApiErrorBody, ApiResponse, ProfileResponse, TokenResponse } from "@/types/api";

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
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const first = error.details.violations?.[0];
    return first ? `${first.field}: ${first.message}` : error.message;
  }
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
