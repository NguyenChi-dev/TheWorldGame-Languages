import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { PageHeader, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.logs.label };

/** /logs: khung các mục con (tab ?tab=...), chưa có chức năng. */
export default async function LogsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSection("logs");
  const { active, bar } = sectionTabs("logs", (await searchParams).tab);

  return (
    <>
      <PageHeader section="logs" />
      {bar}
      <PlaceholderPanel title={active?.label} />
    </>
  );
}
