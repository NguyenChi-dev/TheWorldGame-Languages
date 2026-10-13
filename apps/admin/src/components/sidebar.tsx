"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";

export interface SidebarItem {
  href: string;
  label: string;
}

/** Danh sách `items` đã được lọc theo vai trò ở máy chủ (app/(admin)/layout.tsx). */
export function Sidebar({
  items,
  email,
  roleLabel,
}: {
  items: SidebarItem[];
  email: string | null;
  roleLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col bg-slate-900 text-slate-100 md:w-56 md:shrink-0">
      <div className="px-5 py-4 text-lg font-bold">LW Admin</div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="mt-auto border-t border-slate-800 px-5 py-4 text-sm">
        <p className="truncate text-slate-300">{email}</p>
        <p className="mb-2 text-xs text-slate-500">{roleLabel}</p>
        <button type="submit" className="text-slate-300 underline hover:text-white">
          Đăng xuất
        </button>
      </form>
    </aside>
  );
}
