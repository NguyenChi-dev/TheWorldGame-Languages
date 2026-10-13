import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.logs.label };

export default async function LogsPage() {
  await requireSection("logs");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.logs.label}</PageTitle>
      <ComingLater />
    </>
  );
}
