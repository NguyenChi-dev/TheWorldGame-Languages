import { ShieldIcon } from "@/components/icons";

/**
 * Nội dung cột form trong khung game ((auth)/layout.tsx): nhãn, tiêu đề, form và chân trang.
 * Khung ngoài do layout vẽ, nên ở đây không có viền/bóng riêng.
 */
export function AuthCard({
  title,
  subtitle,
  badge = "Khu vực nhân viên",
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md animate-fade-up">
      <span className="inline-flex -rotate-2 items-center gap-1.5 rounded-lg bg-accent px-3 py-1 font-game text-xs font-bold uppercase tracking-wider text-white shadow-[0_3px_0_0_var(--color-accent-deep)]">
        <ShieldIcon className="size-3.5" />
        {badge}
      </span>
      <h1 className="mt-3 font-game text-3xl font-extrabold leading-tight text-slate-900 short:mt-2 short:text-2xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      <div className="mt-5 short:mt-3">{children}</div>
      {footer ? <div className="mt-4 text-center text-sm text-slate-600 short:mt-3">{footer}</div> : null}
    </div>
  );
}
