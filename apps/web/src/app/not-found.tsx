import Link from "next/link";

/** Trang không tồn tại (gõ sai địa chỉ, link cũ). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sky-100 p-6">
      <div className="w-full max-w-md rounded-3xl border-4 border-amber-900/20 bg-amber-50 p-6 text-center shadow-xl">
        <p className="font-poly text-5xl text-amber-900/70">404</p>
        <h1 className="mt-2 font-game text-2xl font-extrabold text-amber-950">Lạc đường rồi!</h1>
        <p className="mt-2 text-sm text-amber-900/80">Vùng đất này không có trên bản đồ.</p>
        <div className="mt-5 flex justify-center">
          <Link href="/" className="wood-chip">
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
