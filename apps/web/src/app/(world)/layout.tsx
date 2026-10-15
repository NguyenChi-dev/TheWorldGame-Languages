import { WorldBackdrop } from "@/components/world/world-backdrop";

/**
 * Trang chủ và trang đăng nhập dùng chung nền thế giới game. Nền nằm ở layout nên khi chuyển
 * giữa 2 trang, ảnh và hiệu ứng không bị tải lại / chạy lại từ đầu.
 */
export default function WorldLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative h-dvh min-h-[600px] overflow-hidden bg-sky-300">
      <WorldBackdrop />
      {children}
    </div>
  );
}
