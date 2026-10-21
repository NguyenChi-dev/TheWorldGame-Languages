import { cookies } from "next/headers";
import { ROLE_LABELS, sectionsForRole } from "@lw/shared";
import { ToastProvider } from "@lw/ui";
import { BackCacheGuard } from "@/components/auth/back-cache-guard";
import { SessionWatch } from "@/components/auth/session-watch";
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
      <BackCacheGuard />
      <SessionWatch userId={session.userId} role={session.role} />
      <Sidebar
        items={sectionsForRole(session.role).map((section) => ({
          key: section.key,
          href: section.href,
          label: section.label,
          group: section.group,
          children: "children" in section ? section.children : undefined,
        }))}
        email={session.email}
        roleLabel={ROLE_LABELS[session.role]}
        defaultCollapsed={collapsed}
        needsMfa={session.aal !== "aal2"}
      />
      <main className="min-w-0 flex-1 p-4 md:p-6">
        {/* Thanh tiêu đề (máy tính; trên điện thoại thanh bên đã là dải tiêu đề). Bên phải để trống cho tên người dùng. */}
        <header className="mx-auto mb-5 hidden max-w-6xl items-center justify-between border-b border-secondary pb-3 md:flex">
          <p className="font-game text-base font-bold text-slate-700">Language World Admin</p>
          <div data-slot="user" className="min-h-8 min-w-32" />
        </header>
        {/* ToastProvider: thông báo thành công / lỗi (toast) cho mọi trang quản trị. */}
        <ToastProvider>
          <div className="mx-auto max-w-6xl">{children}</div>
        </ToastProvider>
      </main>
    </div>
  );
}
