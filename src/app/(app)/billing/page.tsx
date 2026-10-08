import { WalletCard } from "@/features/billing/wallet-card";

export const metadata = {
  title: "Ví AI Credit | Smart Learning Assistant",
  description: "Xem số dư Credit khả dụng và tạm giữ để sử dụng các tính năng AI.",
};

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2">
      <WalletCard />
    </div>
  );
}
