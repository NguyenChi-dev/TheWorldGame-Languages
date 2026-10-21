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
  /** Mục con, hiện ra bên dưới khi đang ở trong mục này (ví dụ Vùng đất › Thiết kế bản đồ 3D). */
  children?: readonly { href: string; label: string }[];
  /** Số nhỏ bên phải (ví dụ số việc đang chờ). Không có thì không hiện. */
  badge?: number;
}

/** Mục con đang mở: mục có đường dẫn khớp dài nhất (/lands/skills thắng /lands). */
function activeChildHref(children: readonly { href: string }[], pathname: string): string | null {
  const matches = children
    .map((child) => child.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

/** Tên nhóm trên thanh bên; mục không thuộc nhóm nào (Tổng quan) nằm trong nhóm "Bắt đầu". */
const groupLabel = (group: AdminSectionGroup | null) => (group ? ADMIN_SECTION_GROUPS[group] : "Bắt đầu");

/** Chấm màu đầu mỗi nhóm (cùng tông hồng, đậm nhạt khác nhau để phân biệt nhóm). */
const GROUP_DOT: Record<AdminSectionGroup | "start", string> = {
  start: "bg-primary",
  content: "bg-rose-mid",
  economy: "bg-amber-400",
  operations: "bg-accent",
};

/** Gom các mục liền nhau cùng nhóm thành từng khối (giữ thứ tự của ADMIN_SECTIONS). */
function groupItems(items: SidebarItem[]) {
  const groups: { group: AdminSectionGroup | null; items: SidebarItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

const iconButtonClass =
  "flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" aria-label="Đăng xuất" title="Đăng xuất" className={iconButtonClass}>
        <LogOutIcon className="size-4.5" />
      </button>
    </form>
  );
}

/**
 * Thanh bên: logo + tên + khẩu hiệu, menu chia nhóm (icon trong vòng tròn, mục đang mở là "viên thuốc"
 * nổi có icon tô màu), thẻ người dùng bo tròn ở cuối. Màu theo bảng màu hồng của trang quản trị.
 * - Máy tính: thu gọn còn cột icon (nút tròn trên mép phải, hoặc Ctrl/⌘ + B); rê chuột vào icon để xem tên.
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
  const initial = (email ?? "?").charAt(0).toUpperCase();

  return (
    <aside
      className={`relative z-10 flex shrink-0 flex-col border-b border-secondary bg-white transition-[width] duration-200 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r ${
        collapsed ? "md:w-20" : "md:w-72"
      }`}
    >
      {/* Đầu thanh bên: logo + tên + khẩu hiệu. */}
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 md:border-b md:border-secondary md:py-5 ${
          collapsed ? "md:justify-center md:px-0" : "md:px-5"
        }`}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3"
          title={collapsed ? "Tổng quan" : undefined}
        >
          <Image src={logo} alt="The World Language" sizes="56px" className="h-10 w-auto shrink-0 md:h-12" />
          <span className={`min-w-0 ${hideWhenCollapsed}`}>
            <span className="block whitespace-nowrap font-game text-xl font-extrabold leading-tight text-slate-900">
              Language<span className="text-accent">World</span>
            </span>
            <span className="hidden text-xs leading-snug text-slate-500 md:block">
              Trang quản trị. Dựng thế giới học ngôn ngữ của bạn.
            </span>
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
            className={iconButtonClass}
          >
            <FaIcon icon={mobileOpen ? faXmark : faBars} />
          </button>
        </div>
      </div>

      {/* Nút thu gọn / mở rộng: vòng tròn nằm trên mép phải (chỉ máy tính). */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        title={`${collapsed ? "Mở rộng" : "Thu gọn"} (Ctrl + B)`}
        className="absolute -right-4 top-22 z-20 hidden size-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-4 ring-background transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-primary md:flex"
      >
        <SidebarToggleIcon
          className={`size-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      <nav
        id="admin-nav"
        aria-label="Menu quản trị"
        className={`${mobileOpen ? "flex" : "hidden"} flex-col gap-3 px-3 pb-3 md:flex md:flex-1 md:overflow-y-auto md:overflow-x-hidden md:py-3`}
      >
        {groupItems(items).map(({ group, items: groupItemsList }) => (
          // Mỗi nhóm là một khối riêng (nền nhạt, viền), tiêu đề nhóm + số mục ở trên.
          <section
            key={group ?? "start"}
            aria-label={groupLabel(group)}
            className={`rounded-2xl border border-secondary bg-white ${collapsed ? "md:p-1" : "p-1.5"}`}
          >
            <h2
              className={`flex items-center gap-2 px-2.5 pb-1.5 pt-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-700 ${
                collapsed ? "md:sr-only" : ""
              }`}
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${GROUP_DOT[group ?? "start"]}`} />
              {groupLabel(group)}
              <span className="ml-auto rounded-full bg-secondary px-1.5 text-[10px] font-bold tracking-normal text-accent">
                {groupItemsList.length}
              </span>
            </h2>
            <div className="flex flex-col gap-0.5">
              {groupItemsList.map((item) => {
                // Route con (ví dụ /lands/en/areas/...) vẫn tô sáng mục cha.
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = SECTION_META[item.key].icon;
                return (
                  <Fragment key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active && !item.children ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl p-1 pr-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        collapsed ? "md:justify-center md:pr-1" : ""
                      } ${
                        active
                          ? "bg-secondary font-semibold text-accent"
                          : "font-medium text-slate-600 hover:bg-secondary/50 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                          active
                            ? "bg-accent text-white"
                            : "bg-white text-slate-500 ring-1 ring-secondary group-hover:text-accent"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className={`flex-1 ${hideWhenCollapsed}`}>{item.label}</span>
                      {item.badge ? (
                        <span
                          className={`flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold leading-6 text-white ${
                            collapsed
                              ? "md:absolute md:-right-1 md:-top-1 md:min-w-5 md:text-[10px] md:leading-5"
                              : ""
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                    {/* Mục con: chỉ hiện khi đang ở trong mục cha và thanh bên không thu gọn. */}
                    {active && item.children && !collapsed ? (
                      <div className="mb-2 mt-1.5 flex shrink-0 gap-1 md:ml-7 md:flex-col md:border-l-2 md:border-secondary md:pl-3">
                        {item.children.map((child, childIndex) => {
                          const childActive = activeChildHref(item.children ?? [], pathname) === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              aria-current={childActive ? "page" : undefined}
                              // Trượt xuống lần lượt khi mở mục cha (tắt nếu người dùng chọn giảm chuyển động).
                              style={{ animationDelay: `${childIndex * 45}ms` }}
                              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-colors motion-safe:animate-submenu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                childActive
                                  ? "bg-secondary/60 font-semibold text-accent"
                                  : "text-slate-500 hover:bg-secondary/40 hover:text-slate-900"
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
            </div>
          </section>
        ))}
      </nav>

      {/* Thẻ người dùng (máy tính). Thu gọn: chỉ còn ảnh đại diện + các nút xếp dọc. */}
      <div className="hidden border-t border-secondary p-3 md:block">
        <div
          className={`flex gap-2 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-secondary ${
            collapsed ? "flex-col items-center px-1.5" : "items-center"
          }`}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-game text-base font-bold text-white"
            title={collapsed ? `${email ?? ""} · ${roleLabel}` : undefined}
          >
            {initial}
          </span>
          <div className={`ml-1 min-w-0 flex-1 ${hideWhenCollapsed}`}>
            <p className="truncate text-sm font-bold text-slate-900" title={email ?? undefined}>
              {email}
            </p>
            <p className="truncate text-xs font-medium text-accent">{roleLabel}</p>
          </div>
          {needsMfa ? (
            <Link
              href={`/login/mfa?next=${encodeURIComponent(pathname)}`}
              aria-label="Xác thực hai lớp"
              title="Xác thực hai lớp: cần cho đổi vai trò, quản lý tài khoản người chơi, xóa nội dung"
              className={`relative ${iconButtonClass} text-amber-600`}
            >
              <ShieldIcon className="size-4.5" />
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-500 ring-2 ring-white"
              />
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
