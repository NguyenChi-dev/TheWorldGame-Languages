import { useId, type ReactNode } from "react";

/** Class chung cho ô nhập trong các form quản trị (gọn, viền hồng nhạt). */
export const fieldClass =
  "block w-full rounded-lg border border-secondary bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50";

/** Nhãn + ô nhập + gợi ý. `children` nhận id để gắn vào ô nhập (label htmlFor). */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
