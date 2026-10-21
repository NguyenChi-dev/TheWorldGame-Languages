"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ADMIN_SECTION_GROUPS, type AdminSectionGroup, type AdminSectionKey } from "@lw/shared";
import logo from "@lw/assets/Logo.png";
import { signOut } from "@/app/(auth)/actions";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/fa-icon";
import { LogOutIcon, ShieldIcon, SidebarToggleIcon } from "@/components/icons";
import { SECTION_META } from "@/components/section-meta";
import { SIDEBAR_COOKIE } from "@/components/sidebar-cookie";

export interface SidebarItem {
  key: AdminSectionKey;
  href: string;
  label: string;
  /** Nhóm trên thanh bên (Nội dung học, Kinh tế, Vận hành); null = không thuộc nhóm (Tổng quan). */
  group: AdminSectionGroup | null;
  /** Mục con, hiện ra bên dưới khi đang ở trong mục này (ví dụ Vùng đất › Kỹ năng luyện tập). */
  children?: readonly { href: string; label: string }[];
}

/** Mục con đang mở: mục có đường dẫn khớp dài nhất (/lands/skills thắng /lands). */
function activeChildHref(children: readonly { href: string }[], pathname: string): string | null {
  const matches = children
    .map((child) => child.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
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
 * - Điện thoại: menu thu vào nút ☰ ở dải trên cùng, bấm để mở danh sách dọc (chuyển trang thì tự đóng).
 * Danh sách `items` đã được lọc theo vai trò ở máy chủ (app/(admin)/layout.tsx).
 */
export function Sidebar({
  items,
  email,
  roleLabel,
  defaultCollapsed = false,
  needsMfa = false,
}: {
  items: SidebarItem[];
  email: string | null;
  roleLabel: string;
  defaultCollapsed?: boolean;
  /** Phiên chưa qua xác thực hai lớp (công tắc 2 lớp đang tắt): hiện nút để xác thực bổ sung. */
  needsMfa?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  /** Điện thoại: menu thu vào nút ☰, mở ra thành danh sách dọc. */
  const [mobileOpen, setMobileOpen] = useState(false);
  // Chuyển trang thì đóng menu điện thoại.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setMobileOpen(false);
  }

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
        <div className="flex items-center gap-1 md:hidden">
          <SignOutButton />
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="admin-nav"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            className="flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <FaIcon icon={mobileOpen ? faXmark : faBars} />
          </button>
        </div>
      </div>

      <nav
        id="admin-nav"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col gap-1 px-2 pb-2 md:flex md:flex-1 md:overflow-y-auto md:overflow-x-hidden md:py-2`}
      >
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
                aria-current={active && !item.children ? "page" : undefined}
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
              {/* Mục con: chỉ hiện khi đang ở trong mục cha và thanh bên không thu gọn. */}
              {active && item.children && !collapsed ? (
                <div className="flex shrink-0 gap-1 md:ml-5 md:flex-col md:border-l md:border-secondary md:pl-2">
                  {item.children.map((child) => {
                    const childActive = activeChildHref(item.children ?? [], pathname) === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          childActive
                            ? "bg-secondary/70 font-semibold text-accent"
                            : "text-slate-500 hover:bg-background hover:text-slate-900"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
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
        {needsMfa ? (
          <Link
            href={`/login/mfa?next=${encodeURIComponent(pathname)}`}
            aria-label="Xác thực hai lớp"
            title="Xác thực hai lớp: cần cho đổi vai trò, quản lý tài khoản người chơi, xóa nội dung"
            className="flex size-8 items-center justify-center rounded-lg text-amber-600 transition-colors hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ShieldIcon className="size-4.5" />
          </Link>
        ) : null}
        <SignOutButton />
      </div>
    </aside>
  );
}
