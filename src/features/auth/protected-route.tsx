"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { PageLoading } from "@/components/ui/states";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    if (status === "authenticated" && profile?.role === "ADMIN") router.replace("/admin");
    if (status === "authenticated" && profile?.role === "USER" && !profile.profile?.setupCompleted)
      router.replace("/onboarding/profile");
  }, [status, profile, pathname, router]);
  if (status !== "authenticated" || profile?.role !== "USER" || !profile.profile?.setupCompleted)
    return <PageLoading label="Đang xác thực phiên làm việc…" />;
  return children;
}

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "authenticated" && profile?.role === "ADMIN") router.replace("/admin");
  }, [status, profile, router]);
  if (status !== "authenticated" || profile?.role !== "USER")
    return <PageLoading label="Đang xác thực phiên làm việc…" />;
  return children;
}
