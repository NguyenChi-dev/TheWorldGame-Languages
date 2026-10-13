import { ROLE_LABELS, sectionsForRole } from "@lw/shared";
import { Sidebar } from "@/components/sidebar";
import { requireSection } from "@/lib/auth";

/**
 * Khung chung cho mọi trang quản trị.
 * - Chặn người chưa đăng nhập, chưa qua 2 lớp, hoặc là người chơi.
 * - Menu chỉ hiện các mục vai trò này được vào (lớp 1). Mỗi trang vẫn tự gọi requireSection
 *   (lớp 2), vì layout không chạy lại khi chuyển trang phía trình duyệt.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSection("overview");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        items={sectionsForRole(session.role).map(({ href, label }) => ({ href, label }))}
        email={session.email}
        roleLabel={ROLE_LABELS[session.role]}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
