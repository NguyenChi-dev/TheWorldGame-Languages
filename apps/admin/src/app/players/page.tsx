import type { Metadata } from "next";
import { ComingLater, PageTitle } from "@/components/page-title";

export const metadata: Metadata = { title: "Người chơi" };

export default function PlayersPage() {
  return (
    <>
      <PageTitle>Người chơi</PageTitle>
      <ComingLater />
    </>
  );
}
