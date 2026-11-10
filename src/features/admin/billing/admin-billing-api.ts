import { apiRequest } from "@/lib/api-client";
import type { AiPurpose, PageResponse } from "@/types/api";

export type CatalogStatus = "ACTIVE" | "ARCHIVED";

export interface AdminCreditPackage {
  id: string;
  version: number;
  packageCode: string;
  name: string;
  priceVnd: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  sortOrder: number;
  status: CatalogStatus;
}

export type PackageInput = Omit<
  AdminCreditPackage,
  "id" | "status" | "totalCredits" | "version"
> & {
  version?: number;
};

export interface AdminCreditRate {
  id: string;
  version: number;
  purpose: AiPurpose;
  modelCategory: string | null;
  creditCost: number;
  status: CatalogStatus;
  effectiveFrom: string;
}

export interface RateInput {
  purpose: AiPurpose;
  modelCategory: string | null;
  creditCost: number;
  version?: number;
}

export interface AdminWallet {
  userId: string;
  email: string;
  walletId: string | null;
  version: number | null;
  availableCredits: number;
  reservedCredits: number;
  initialized: boolean;
}

export interface AdjustmentInput {
  delta: number;
  reason: string;
  version: number | null;
}

export interface AdjustmentResult {
  ledgerEntryId: string;
  userId: string;
  delta: number;
  availableCredits: number;
  reservedCredits: number;
  recordedAt: string;
  replayed: boolean;
}

const root = "/api/v1/admin/billing";

export const adminBillingApi = {
  packages(page: number, status: CatalogStatus | "", signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    return apiRequest<PageResponse<AdminCreditPackage>>(`${root}/packages?${query}`, { signal });
  },
  createPackage: (input: PackageInput) =>
    apiRequest<AdminCreditPackage>(`${root}/packages`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePackage: (id: string, input: PackageInput) =>
    apiRequest<AdminCreditPackage>(`${root}/packages/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  packageStatus: (item: AdminCreditPackage, status: CatalogStatus) =>
    apiRequest<AdminCreditPackage>(`${root}/packages/${item.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ version: item.version, status }),
    }),
  rates(page: number, status: CatalogStatus | "", purpose: AiPurpose | "", signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), size: "20" });
    if (status) query.set("status", status);
    if (purpose) query.set("purpose", purpose);
    return apiRequest<PageResponse<AdminCreditRate>>(`${root}/ai-rates?${query}`, { signal });
  },
  createRate: (input: RateInput) =>
    apiRequest<AdminCreditRate>(`${root}/ai-rates`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  replaceRate: (id: string, input: RateInput) =>
    apiRequest<AdminCreditRate>(`${root}/ai-rates/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  activationPreview: (id: string) =>
    apiRequest<{ selected: AdminCreditRate; current: AdminCreditRate | null }>(
      `${root}/ai-rates/${id}/activation-preview`,
    ),
  rateStatus: (
    item: AdminCreditRate,
    status: CatalogStatus,
    current: AdminCreditRate | null = null,
  ) =>
    apiRequest<AdminCreditRate>(`${root}/ai-rates/${item.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        version: item.version,
        status,
        replacesRateId: current?.id ?? null,
        replacesRateVersion: current?.version ?? null,
      }),
    }),
  lookup: (account: string) =>
    apiRequest<AdminWallet>(`${root}/wallets/lookup?${new URLSearchParams({ account })}`),
  wallet: (userId: string) => apiRequest<AdminWallet>(`${root}/wallets/${userId}`),
  adjust: (userId: string, key: string, input: AdjustmentInput) =>
    apiRequest<AdjustmentResult>(`${root}/wallets/${userId}/adjustments`, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(input),
    }),
};
