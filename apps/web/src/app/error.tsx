"use client";

import Link from "next/link";

/**
 * Lỗi không lường trước trong game (mất mạng giữa chừng, máy chủ không phản hồi...).
 * Không hiện chi tiết kỹ thuật, không đăng xuất người chơi: chỉ báo và cho thử lại.
 */
export default function GameError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sky-100 p-6">
      <div className="w-full max-w-md rounded-3xl border-4 border-amber-900/20 bg-amber-50 p-6 text-center shadow-xl">
        <h1 className="font-game text-2xl font-extrabold text-amber-950">Ối, có trục trặc rồi!</h1>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
          Máy chủ không phản hồi hoặc mạng đang gián đoạn. Tiến trình của bạn vẫn được giữ nguyên.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={reset} className="wood-chip">
            Thử lại
          </button>
          <Link href="/" className="wood-chip">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
