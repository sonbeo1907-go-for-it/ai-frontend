import { apiRequest } from "@/lib/api-client";
import type { DashboardReport } from "@/types/api";

export async function fetchDashboardReport(): Promise<DashboardReport> {
  return apiRequest<DashboardReport>("/api/v1/reports/dashboard");
}
