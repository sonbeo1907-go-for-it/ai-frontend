import Link from "next/link";
import { MapPinOff } from "lucide-react";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <MapPinOff className="size-7" />
        </div>
        <h1 className="mt-5 text-3xl font-black">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Địa chỉ có thể đã thay đổi hoặc tài nguyên không tồn tại.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white"
        >
          Về trang chính
        </Link>
      </div>
    </main>
  );
}
