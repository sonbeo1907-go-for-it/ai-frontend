"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Cpu, LogOut, ShieldCheck, Wrench } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/states";
export default function AdminPage() {
  const router = useRouter();
  const { status, profile, logout } = useAuth();
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "authenticated" && profile?.role !== "ADMIN") router.replace("/dashboard");
  }, [status, profile, router]);
  if (status !== "authenticated" || profile?.role !== "ADMIN")
    return <PageLoading label="Đang kiểm tra quyền quản trị…" />;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="font-black">Lumio Admin</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                AI configuration only
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => void logout().then(() => router.replace("/login"))}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-5 py-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
            <ShieldCheck className="size-4" />
            ADMIN workspace
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Quản trị cấu hình AI</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            ADMIN không có lối điều hướng hoặc quyền truy cập vào hồ sơ, tài liệu, lộ trình và kế
            hoạch học tập cá nhân.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Cpu className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-black">Nhà cung cấp và mô hình AI</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Backend Sprint 1 hiện chưa công bố controller cho cấu hình AI provider. Màn hình quản
              trị sẽ được kích hoạt khi API này tồn tại.
            </p>
            <Button className="mt-5" disabled>
              Chưa có API
            </Button>
          </Card>
          <Card className="border-amber-200 bg-amber-50/60 p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              <Wrench className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-black text-amber-950">Phạm vi được khóa an toàn</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900/70">
              Frontend không giả lập dữ liệu provider và không hiển thị tài nguyên cá nhân cho
              ADMIN. Đây là trạng thái đúng với API hiện tại.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
