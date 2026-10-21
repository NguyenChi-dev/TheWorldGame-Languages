import Link from "next/link";

/** Trang không tồn tại trong trang quản trị (gõ sai địa chỉ, id không còn). */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-secondary bg-white p-6 text-center shadow-sm">
        <p className="font-game text-4xl font-extrabold text-accent">404</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-slate-600">Địa chỉ không đúng hoặc nội dung đã bị xóa.</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Về Tổng quan
        </Link>
      </div>
    </main>
  );
}
