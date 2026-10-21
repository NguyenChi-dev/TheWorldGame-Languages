import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageHeader, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lessons.label };

/** /lessons: khung các mục con (tab ?tab=...), chưa có chức năng. */
export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("lessons");
  const { active, bar } = sectionTabs("lessons", (await searchParams).tab);

  return (
    <>
      <PageHeader section="lessons" />
      {bar}
      <PlaceholderPanel title={active?.label} />
    </>
  );
}
