import { cookies } from "next/headers";
import { ROLE_LABELS, sectionsForRole } from "@lw/shared";
import { Sidebar } from "@/components/sidebar";
import { SIDEBAR_COOKIE } from "@/components/sidebar-cookie";
import { requireSection } from "@/lib/auth";

/**
 * Khung chung cho mọi trang quản trị.
 * - Chặn người chưa đăng nhập, chưa qua 2 lớp, hoặc là người chơi.
 * - Menu chỉ hiện các mục vai trò này được vào (lớp 1). Mỗi trang vẫn tự gọi requireSection
 *   (lớp 2), vì layout không chạy lại khi chuyển trang phía trình duyệt.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSection("overview");
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <div className="min-h-dvh bg-background md:flex">
      <Sidebar
        items={sectionsForRole(session.role).map(({ key, href, label, group }) => ({
          key,
          href,
          label,
          group,
        }))}
        email={session.email}
        roleLabel={ROLE_LABELS[session.role]}
        defaultCollapsed={collapsed}
      />
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
