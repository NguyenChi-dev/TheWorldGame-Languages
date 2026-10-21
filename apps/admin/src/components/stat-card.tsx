/** Ô thẻ số liệu. Chưa có số thì để `value` trống: hiện dấu "—". */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value?: number | string | null;
  hint?: string;
}) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 font-game text-2xl font-extrabold ${empty ? "text-slate-300" : "text-slate-900"}`}
        aria-label={empty ? `${label}: chưa có số liệu` : undefined}
      >
        {empty ? "—" : typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
