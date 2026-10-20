"use client";

import Link from "next/link";
/**
 * Lỗi không lường trước ở trang quản trị, ví dụ không hỏi được máy chủ xác thực (mất mạng).
 * Không hiện chi tiết lỗi, không xóa phiên đăng nhập: chỉ báo và cho thử lại.
 */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-secondary bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Không tải được trang</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Máy chủ không phản hồi hoặc mạng đang gián đoạn. Phiên đăng nhập của bạn vẫn được giữ nguyên.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Thử lại
          </button>
          <Link
            href="/login"
            className="rounded-xl border border-secondary px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
