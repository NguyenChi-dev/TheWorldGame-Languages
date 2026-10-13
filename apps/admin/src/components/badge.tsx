const TONES = {
  accent: "bg-secondary text-accent",
  muted: "bg-slate-100 text-slate-500",
  success: "bg-emerald-50 text-emerald-700",
} as const;

/** Nhãn nhỏ: trạng thái, kỹ năng, mã ngôn ngữ... */
export function Badge({
  tone = "accent",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="success">Đang mở</Badge> : <Badge tone="muted">Đang tắt</Badge>;
}
