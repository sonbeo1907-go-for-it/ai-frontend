import { apiRequest } from "@/lib/api-client";
import type { Material, MaterialStatus, MaterialType, PageResponse } from "@/types/api";

export interface FetchMaterialsParams {
  page?: number;
  size?: number;
  sort?: string;
  query?: string;
  type?: MaterialType | "";
  status?: MaterialStatus | "";
  archived?: boolean;
}

export async function fetchMaterials({
  page = 0,
  size = 12,
  sort = "createdAt,desc",
  query,
  type,
  status,
  archived,
}: FetchMaterialsParams): Promise<PageResponse<Material>> {
  const parameters = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });
  if (archived) parameters.set("archived", "true");
  if (query) parameters.set("q", query);
  if (type) parameters.set("type", type);
  if (status) parameters.set("status", status);

  return apiRequest<PageResponse<Material>>(`/api/v1/materials?${parameters.toString()}`);
}

export async function uploadMaterialFile(file: File): Promise<Material> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<Material>("/api/v1/materials", {
    method: "POST",
    body: form,
  });
}

export interface CreateTextMaterialPayload {
  type: Exclude<MaterialType, "FILE">;
  content: string;
}

export async function createMaterialText(payload: CreateTextMaterialPayload): Promise<Material> {
  return apiRequest<Material>("/api/v1/materials/text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function archiveMaterial(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/materials/${id}`, {
    method: "DELETE",
  });
}

export async function restoreMaterial(id: string): Promise<Material> {
  return apiRequest<Material>(`/api/v1/materials/${id}/restore`, {
    method: "POST",
  });
}
