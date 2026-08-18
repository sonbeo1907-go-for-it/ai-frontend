"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { status, profile } = useAuth();
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "authenticated") {
      if (profile?.role === "ADMIN") router.replace("/admin");
      else if (!profile?.profile?.setupCompleted) router.replace("/onboarding/profile");
      else router.replace("/dashboard");
    }
  }, [status, profile, router]);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <BookOpen className="size-7" />
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight text-slate-950">Lumio</p>
          <p className="mt-1 text-sm text-slate-500">Đang chuẩn bị không gian học tập…</p>
        </div>
        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 animate-soft-pulse rounded-full bg-indigo-600" />
        </div>
      </div>
    </main>
  );
}
