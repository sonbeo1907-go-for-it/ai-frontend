"use client";
import type { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-context";
import { ToastProvider } from "./toast-provider";
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
