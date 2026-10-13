export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-4 text-2xl font-bold text-slate-800">{children}</h1>;
}

/** Dòng nhắc cho các trang chưa làm. */
export function ComingLater() {
  return <p className="text-slate-600">Sẽ làm ở giai đoạn sau</p>;
}
