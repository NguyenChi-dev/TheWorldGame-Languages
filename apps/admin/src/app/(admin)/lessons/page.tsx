import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { ComingLater, PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lessons.label };

export default async function LessonsPage() {
  await requireSection("lessons");

  return (
    <>
      <PageTitle>{ADMIN_SECTIONS.lessons.label}</PageTitle>
      <ComingLater />
    </>
  );
}
