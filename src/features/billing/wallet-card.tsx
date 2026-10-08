"use client";

import { Coins, Lock, RefreshCw, Sparkles, ShieldCheck, Info } from "lucide-react";
import { useCreditWallet } from "./use-credit-wallet";

export function WalletCard() {
  const { wallet, loading, refreshing, error, refresh } = useCreditWallet();

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-xs">
          <p className="font-semibold">Không thể tải thông tin ví</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
      )}

      {/* Main Balance Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/30 p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm shadow-indigo-500/20">
              <Coins className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Ví AI Credit
                </h2>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading || refreshing}
                  className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition"
                  title="Làm mới số dư"
                  aria-label="Làm mới"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý số dư tín dụng để sinh lộ trình và học tập cùng trợ lý AI
              </p>
            </div>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Available Credits */}
          <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-emerald-600" />
                Credit Khả dụng
              </span>
              <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Sẵn sàng sử dụng
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {loading ? "..." : (wallet?.availableCredits ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Credits
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Số dư khả dụng để yêu cầu AI sinh lộ trình, gợi ý kế hoạch ngày hoặc bài ôn tập.
            </p>
          </div>

          {/* Reserved Credits */}
          <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
              <span className="flex items-center gap-1.5">
                <Lock className="size-4 text-amber-600" />
                Credit Đang giữ chỗ
              </span>
              <span className="rounded-md bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Tạm khóa
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {loading ? "..." : (wallet?.reservedCredits ?? 0).toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Credits
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Số credit tạm thời khoá trong khi tác vụ AI đang thực thi và sẽ được quyết toán khi hoàn thành.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Learning Assurance Policy */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 text-slate-700 shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="size-5 shrink-0 text-indigo-600 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-bold text-indigo-950 text-sm">
              Nguyên tắc học tập không gián đoạn
            </p>
            <p className="text-slate-600">
              Ngay cả khi số dư Credit bằng 0, bạn vẫn toàn quyền chủ động tự tạo, chỉnh sửa lộ trình học, thiết lập kế hoạch ngày và tích hợp các tài liệu học tập theo quy trình thủ công mà không gặp bất kỳ rào cản nào.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Ledger Immutability Note */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <ShieldCheck className="size-4 text-emerald-600" />
          Minh bạch tài chính & Sổ cái bất biến (Ledger)
        </div>
        <p className="mt-1.5 leading-relaxed">
          Mỗi biến động số dư trong ví đều được bảo vệ bằng cơ chế sổ cái kép bất biến (immutable append-only ledger). Chỉ bạn mới có quyền xem thông tin ví cá nhân của mình.
        </p>
      </div>
    </div>
  );
}
