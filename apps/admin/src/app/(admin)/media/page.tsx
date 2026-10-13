import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.media.label };

export default async function MediaPage() {
  await requireSection("media");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.media.label}</PageTitle>
      <ComingLater />
    </>
  );
}
