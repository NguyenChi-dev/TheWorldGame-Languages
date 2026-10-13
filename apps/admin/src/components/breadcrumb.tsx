import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Đường dẫn ở đầu trang, ví dụ: Vùng đất › Tiếng Anh › Nông trại › Bài 1. Mục cuối là trang hiện tại. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="mb-3 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-slate-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-300">
                  ›
                </span>
              ) : null}
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-accent hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="font-medium text-slate-800">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
