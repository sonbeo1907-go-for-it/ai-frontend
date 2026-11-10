import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: { default: "Lumio — Học tập theo cách của bạn", template: "%s | Lumio" },
  description:
    "Nền tảng lập kế hoạch học tập cá nhân với lộ trình, kế hoạch ngày và tiến độ đáng tin cậy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
