import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageHeader, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.words.label };

/** /words: khung các mục con (tab ?tab=...), chưa có chức năng. */
export default async function WordsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("words");
  const { active, bar } = sectionTabs("words", (await searchParams).tab);

  return (
    <>
      <PageHeader section="words" />
      {bar}
      <PlaceholderPanel title={active?.label} />
    </>
  );
}
