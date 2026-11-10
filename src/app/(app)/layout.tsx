import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ProtectedRoute } from "@/features/auth/protected-route";
export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
