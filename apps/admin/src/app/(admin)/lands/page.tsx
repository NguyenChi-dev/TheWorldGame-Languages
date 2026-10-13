import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lands.label };

export default async function LandsPage() {
  await requireSection("lands");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.lands.label}</PageTitle>
      <ComingLater />
    </>
  );
}
