"use client";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <CircleAlert className="size-7" />
        </div>
        <h2 className="mt-5 text-2xl font-black">Không thể hiển thị nội dung</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Một lỗi không mong đợi đã xảy ra. Dữ liệu của bạn chưa bị thay đổi.
        </p>
        <Button className="mt-6" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </main>
  );
}
