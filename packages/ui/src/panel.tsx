import type { HTMLAttributes } from "react";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

/** Khung nền trắng bo góc để nhóm nội dung. */
export function Panel({ title, className = "", children, ...props }: PanelProps) {
  return (
    <div className={`rounded-2xl bg-white/90 p-4 shadow-md ring-1 ring-black/5 ${className}`} {...props}>
      {title ? <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2> : null}
      {children}
    </div>
  );
}
