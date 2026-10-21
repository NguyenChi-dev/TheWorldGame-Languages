/**
 * Đang tải trang quản trị (máy chủ đang kiểm tra phiên + quyền và đọc dữ liệu).
 * Khung xương trống: không hiện dữ liệu nào trước khi máy chủ xác thực xong.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Đang tải…</span>
      <div className="h-8 w-56 rounded-lg bg-secondary/70" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm ring-1 ring-secondary" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white shadow-sm ring-1 ring-secondary" />
    </div>
  );
}
