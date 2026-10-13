"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan" },
  { href: "/words", label: "Từ vựng" },
  { href: "/items", label: "Vật phẩm" },
  { href: "/players", label: "Người chơi" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-slate-900 text-slate-100 md:w-56 md:shrink-0">
      <div className="px-5 py-4 text-lg font-bold">LW Admin</div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {NAV_ITEMS.map((item) => {
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
    </aside>
  );
}
