import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireSection("overview");
  const { denied } = await searchParams;

  return (
    <>
      <PageTitle>Tổng quan</PageTitle>
      {denied ? <p className="mb-3 text-sm text-red-700">Bạn không có quyền vào trang vừa mở.</p> : null}
      <ComingLater />
    </>
  );
}
