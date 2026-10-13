/** Tiêu đề trang quản trị, kèm mô tả ngắn nếu có. */
export function PageTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-game text-2xl font-extrabold leading-tight text-slate-900">{children}</h1>
      {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

/** Ô trống cho các trang chưa làm. */
export function ComingLater() {
  return (
    <div className="rounded-2xl border border-dashed border-primary/50 bg-white px-6 py-10 text-center">
      <svg aria-hidden="true" viewBox="-32 -40 64 80" className="mx-auto h-10">
        <polygon points="0,-36 -24,0 0,0" fill="#f7b3c4" />
        <polygon points="0,-36 0,0 24,0" fill="#e88fa5" />
        <polygon points="-24,0 0,36 0,0" fill="#c75c7a" />
        <polygon points="0,0 0,36 24,0" fill="#a83d5a" />
      </svg>
      <p className="mt-3 font-semibold text-slate-800">Tính năng đang được xây dựng</p>
      <p className="mt-0.5 text-sm text-slate-500">Trang này sẽ có ở giai đoạn sau.</p>
    </div>
  );
}
