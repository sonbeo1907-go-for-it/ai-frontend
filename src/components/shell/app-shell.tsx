"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Files,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/roadmaps", label: "Lộ trình", icon: BookOpen },
  { href: "/daily-plans", label: "Kế hoạch ngày", icon: CalendarDays },
  { href: "/materials", label: "Tài liệu nguồn", icon: Files },
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/profile", label: "Hồ sơ", icon: Settings2 },
];

const pageMetadata: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Tổng quan học tập",
    subtitle: "Tiếp tục từ nơi bạn đã dừng lại.",
  },
  "/roadmaps": {
    title: "Lộ trình học tập",
    subtitle: "Xây dựng và quản lý Master Plan theo từng phiên bản.",
  },
  "/daily-plans": {
    title: "Kế hoạch ngày",
    subtitle: "Lập checklist rõ ràng và ghi nhận kết quả thực tế.",
  },
  "/materials": {
    title: "Kho tài liệu nguồn",
    subtitle: "Quản lý an toàn tài liệu thuộc sở hữu của bạn.",
  },
  "/profile": {
    title: "Hồ sơ cá nhân",
    subtitle: "Thiết lập múi giờ, ngôn ngữ và thời lượng học mặc định.",
  },
};

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/roadmaps" className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm">
        <BookOpen className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
            Smart Learning Assistant
          </span>
          <span className="hidden rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 sm:inline">
            Manual MVP
          </span>
        </span>
        <span className="hidden truncate text-[10px] text-slate-500 sm:block">
          Lộ trình và kế hoạch học tập cá nhân
        </span>
      </span>
    </Link>
  );
}

function QuickActions() {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <Link
        href="/onboarding/roadmap"
        className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
      >
        <Plus className="size-3.5" />
        Tạo lộ trình
      </Link>
      <Link
        href="/daily-plans"
        className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        <CalendarDays className="size-3.5" />
        Kế hoạch ngày
      </Link>
      <Link
        href="/materials"
        className="focus-ring hidden h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 xl:inline-flex"
      >
        <Plus className="size-3.5" />
        Nạp tài liệu
      </Link>
    </div>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const displayName = profile?.profile?.displayName || profile?.email || "User";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/profile"
        className="focus-ring flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">
          {initials(displayName)}
        </span>
        <span className="hidden min-w-0 lg:block">
          <span className="block max-w-28 truncate text-[11px] font-bold text-slate-900">
            {displayName}
          </span>
          <span className="block max-w-28 truncate text-[9px] text-slate-500">USER</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        aria-label="Đăng xuất"
        title="Đăng xuất"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function NavigationTabs({
  pathname,
  onNavigate,
  mobile = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  return (
    <nav className={cn(mobile ? "grid gap-1" : "flex min-w-max items-center gap-1")}>
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = isRouteActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "focus-ring relative flex items-center gap-2 px-3 py-3 text-xs font-bold transition sm:text-sm",
              mobile ? "rounded-lg" : "rounded-t-lg",
              active
                ? mobile
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-950"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Icon className={cn("size-4", active ? "text-slate-900" : "text-slate-400")} />
            {label}
            {active && !mobile && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-slate-900" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const baseRoute = `/${pathname.split("/")[1]}`;
  const metadata = pageMetadata[baseRoute] ?? {
    title: "Không gian học tập",
    subtitle: "Dữ liệu học tập thuộc quyền kiểm soát của bạn.",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-xl">
        <div className="border-b border-slate-100 bg-slate-50/80">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-3 px-4 text-[10px] text-slate-500 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3 text-blue-600" />
                Mặc định:
                <strong className="text-slate-700">
                  {profile?.profile?.defaultDailyMinutes ?? 60} phút/ngày
                </strong>
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <Globe2 className="size-3 text-slate-400" />
                {profile?.profile?.timeZone ?? "UTC"}
              </span>
            </div>
            <span className="font-semibold text-slate-600">Không gian học tập cá nhân</span>
          </div>
        </div>

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="focus-ring rounded-lg border border-slate-200 p-2 text-slate-600 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="size-5" />
          </button>
          <Brand />
          <div className="ml-auto flex items-center gap-3">
            <QuickActions />
            <AccountMenu />
          </div>
        </div>

        <div className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
            <NavigationTabs pathname={pathname} />
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm md:hidden"
          onMouseDown={() => setMobileOpen(false)}
        >
          <aside
            className="h-full w-[min(21rem,90vw)] bg-white p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-8 grid">
              <NavigationTabs pathname={pathname} onNavigate={() => setMobileOpen(false)} mobile />
            </div>
            <div className="mt-8 grid gap-2 border-t border-slate-100 pt-6">
              <Link
                href="/onboarding/roadmap"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-3 text-sm font-bold text-white"
              >
                <Plus className="size-4" />
                Tạo lộ trình mới
              </Link>
              <Link
                href="/materials"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700"
              >
                <Files className="size-4" />
                Nạp tài liệu nguồn
              </Link>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            {metadata.title}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{metadata.subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
