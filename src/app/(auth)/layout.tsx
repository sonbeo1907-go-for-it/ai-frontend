import type { ReactNode } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-28 -top-24 size-80 rounded-full border border-white/10 bg-white/5" />
          <div className="relative flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <BookOpen className="size-6" />
            </div>
            <span className="text-xl font-black tracking-tight">Lumio</span>
          </div>
          <div className="relative max-w-lg">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-200">
              Không gian học tập cá nhân
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              Một kế hoạch rõ ràng cho điều bạn thật sự muốn học.
            </h1>
            <p className="mt-5 text-base leading-7 text-indigo-100/80">
              Tài liệu của bạn. Lộ trình của bạn. Tiến độ được ghi nhận theo cách minh bạch và có
              thể kiểm soát.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-indigo-50">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" /> Dữ liệu học tập chỉ thuộc về
                bạn
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" /> Phiên bản cũ luôn được giữ lại
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" /> Hoạt động thủ công ngay cả khi
                AI chưa sẵn sàng
              </span>
            </div>
          </div>
          <p className="relative text-xs text-indigo-200/70"></p>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-10">{children}</section>
      </div>
    </main>
  );
}
