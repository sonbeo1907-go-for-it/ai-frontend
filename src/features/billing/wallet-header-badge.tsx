"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCreditWallet } from "./use-credit-wallet";

export function WalletHeaderBadge() {
  const { wallet } = useCreditWallet();

  if (!wallet) {
    return null;
  }

  return (
    <Link
      href="/billing"
      className="focus-ring group flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50/50"
      title={`Credit Khả dụng: ${wallet.availableCredits.toLocaleString("vi-VN")} | Đang giữ chỗ: ${wallet.reservedCredits.toLocaleString("vi-VN")}`}
    >
      <div className="grid size-5 place-items-center rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
        <Sparkles className="size-3" />
      </div>
      <span className="font-bold text-slate-900 group-hover:text-indigo-700">
        {wallet.availableCredits.toLocaleString("vi-VN")}
      </span>
      <span className="text-[10px] text-slate-500 font-medium">Credits</span>
      {wallet.reservedCredits > 0 && (
        <span className="ml-0.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
          +{wallet.reservedCredits.toLocaleString("vi-VN")} giữ chỗ
        </span>
      )}
    </Link>
  );
}
