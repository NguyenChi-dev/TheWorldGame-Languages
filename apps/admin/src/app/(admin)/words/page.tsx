import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.words.label };

export default async function WordsPage() {
  await requireSection("words");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.words.label}</PageTitle>
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-white px-6 py-10 text-center">
        <p className="font-semibold text-slate-700">Chưa có nội dung</p>
        <p className="mt-1 text-sm text-slate-500">Chức năng quản lý kho từ vựng sẽ được làm ở đây.</p>
      </div>
    </>
  );
}
