"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ADMIN_SECTION_GROUPS, type AdminSectionGroup, type AdminSectionKey } from "@lw/shared";
import logo from "@lw/assets/Logo.png";
import { signOut } from "@/app/(auth)/actions";
import { LogOutIcon, SidebarToggleIcon } from "@/components/icons";
import { SECTION_META } from "@/components/section-meta";
import { SIDEBAR_COOKIE } from "@/components/sidebar-cookie";

export interface SidebarItem {
  key: AdminSectionKey;
  href: string;
  label: string;
  /** Nhóm trên thanh bên (Nội dung học, Kinh tế, Vận hành); null = không thuộc nhóm (Tổng quan). */
  group: AdminSectionGroup | null;
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Đăng xuất"
        title="Đăng xuất"
        className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <LogOutIcon className="size-4.5" />
      </button>
    </form>
  );
}

/**
 * Thanh bên gọn: logo nhỏ, menu có icon chia theo nhóm, thẻ người dùng 1 dòng.
 * - Máy tính: thu gọn còn cột icon (nút ở cuối menu, hoặc Ctrl/⌘ + B); rê chuột vào icon để xem tên.
 * - Điện thoại: thành dải trên cùng, menu cuộn ngang (không thu gọn).
 * Danh sách `items` đã được lọc theo vai trò ở máy chủ (app/(admin)/layout.tsx).
 */
export function Sidebar({
  items,
  email,
  roleLabel,
  defaultCollapsed = false,
}: {
  items: SidebarItem[];
  email: string | null;
  roleLabel: string;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // Phím tắt Ctrl/⌘ + B, giống các trình soạn thảo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Khi thu gọn: chữ chỉ ẩn trên màn hình rộng (md:sr-only vẫn cho trình đọc màn hình đọc được).
  const hideWhenCollapsed = collapsed ? "md:sr-only" : "";

  return (
    <aside
      className={`flex shrink-0 flex-col border-b border-secondary bg-white transition-[width] duration-200 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r ${
        collapsed ? "md:w-16" : "md:w-56"
      }`}
    >
      <div
        className={`flex h-14 items-center justify-between px-4 ${collapsed ? "md:justify-center md:px-0" : ""}`}
      >
        <Link href="/" className="flex items-center gap-2.5" title={collapsed ? "Tổng quan" : undefined}>
          <Image src={logo} alt="The World Language" sizes="40px" className="h-8 w-auto" />
          <span
            className={`whitespace-nowrap font-game text-lg font-extrabold text-accent ${hideWhenCollapsed}`}
          >
            LW Admin
          </span>
        </Link>
        <div className="md:hidden">
          <SignOutButton />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:py-2">
        {items.map((item, index) => {
          // Route con (ví dụ /lands/en/areas/...) vẫn tô sáng mục cha.
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = SECTION_META[item.key].icon;
          // Tiêu đề nhóm hiện trước mục đầu tiên của mỗi nhóm (chỉ máy tính; thu gọn thì thành vạch ngăn).
          const startsGroup = item.group !== null && item.group !== items[index - 1]?.group;
          return (
            <Fragment key={item.href}>
              {startsGroup && item.group ? (
                collapsed ? (
                  <div aria-hidden="true" className="mx-3 my-2 hidden h-px bg-secondary md:block" />
                ) : (
                  <p className="hidden px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:block">
                    {ADMIN_SECTION_GROUPS[item.group]}
                  </p>
                )
              ) : null}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  active
                    ? "bg-secondary font-semibold text-accent"
                    : "font-medium text-slate-600 hover:bg-background hover:text-slate-900"
                }`}
              >
                <Icon className={`size-4.5 shrink-0 ${active ? "text-accent" : "text-slate-400"}`} />
                <span className={hideWhenCollapsed}>{item.label}</span>
              </Link>
            </Fragment>
          );
        })}
      </nav>

      {/* Nút thu gọn / mở rộng (chỉ máy tính). */}
      <div className="hidden px-2 pb-2 md:block">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          title={`${collapsed ? "Mở rộng" : "Thu gọn"} (Ctrl + B)`}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-background hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <SidebarToggleIcon
            className={`size-4.5 shrink-0 text-slate-400 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
          <span className={hideWhenCollapsed}>Thu gọn</span>
        </button>
      </div>

      {/* Thẻ người dùng (máy tính). Thu gọn: chỉ còn chữ cái đầu + nút đăng xuất xếp dọc. */}
      <div
        className={`hidden gap-2.5 border-t border-secondary p-3 md:flex ${
          collapsed ? "flex-col items-center px-0" : "items-center"
        }`}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white"
          title={collapsed ? `${email ?? ""} · ${roleLabel}` : undefined}
        >
          {(email ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
          <p className="truncate text-xs font-semibold text-slate-800" title={email ?? undefined}>
            {email}
          </p>
          <p className="text-[11px] text-slate-500">{roleLabel}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
