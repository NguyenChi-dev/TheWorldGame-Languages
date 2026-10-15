import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.economy.label };

export default async function EconomyPage() {
  await requireSection("economy");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.economy.label}</PageTitle>
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-white px-6 py-10 text-center">
        <p className="font-semibold text-slate-700">Chưa có nội dung</p>
        <p className="mt-1 text-sm text-slate-500">
          Chức năng quản lý vật phẩm và kinh tế sẽ được làm ở đây.
        </p>
      </div>
    </>
  );
}
