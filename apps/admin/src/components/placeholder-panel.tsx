/** Khung viền đứt cho mục chưa làm ("Sắp có"), hoặc ghi chú chỉ tới nơi đã có chức năng. */
export function PlaceholderPanel({
  title,
  message = "Sắp có",
  children,
}: {
  /** Tên mục con, hiện phía trên khung. */
  title?: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      {title ? <h2 className="mb-2 font-game text-lg font-bold text-slate-900">{title}</h2> : null}
      <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-white px-6 py-10 text-center">
        <p className="font-semibold text-slate-600">{message}</p>
        {children ? <div className="mt-2 text-sm text-slate-500">{children}</div> : null}
      </div>
    </section>
  );
}
