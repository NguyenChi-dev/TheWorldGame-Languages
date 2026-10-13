import Link from "next/link";

/** Khung nội dung gọn dùng trong các trang quản trị: tiêu đề + nút phụ bên phải + nội dung. */
export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    // min-w-0: cho phép chữ dài bị cắt (truncate) thay vì đẩy rộng ô lưới.
    <section className="min-w-0 rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-game text-base font-bold text-slate-900">{title}</h2>
        {action ? (
          <Link href={action.href} className="text-xs font-semibold text-accent hover:underline">
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
