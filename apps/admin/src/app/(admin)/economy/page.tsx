import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageHeader, TabContent, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.economy.label };

/** /economy: khung các mục con (tab ?tab=...), chưa có chức năng. */
export default async function EconomyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("economy");
  const { active, bar } = sectionTabs("economy", (await searchParams).tab);

  return (
    <>
      <PageHeader section="economy" />
      {bar}
      <TabContent tab={active?.key}>
        <PlaceholderPanel title={active?.label} />
      </TabContent>
    </>
  );
}
