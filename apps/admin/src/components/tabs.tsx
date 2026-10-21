import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  count?: number;
}

/** Thanh tab dạng liên kết (?tab=...), chạy ở máy chủ, không cần JavaScript trên trình duyệt. */
export function Tabs({ items, active }: { items: TabItem[]; active: string }) {
  return (
    <div role="tablist" className="mb-5 flex gap-2 overflow-x-auto border-b border-secondary">
      {items.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            scroll={false}
            className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              selected
                ? "border-accent text-accent"
                : "border-transparent text-slate-500 hover:border-primary/50 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 text-[11px] ${selected ? "bg-secondary" : "bg-slate-100 text-slate-500"}`}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
