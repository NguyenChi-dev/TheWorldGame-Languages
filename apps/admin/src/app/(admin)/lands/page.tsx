import type { Metadata } from "next";
import { ADMIN_SECTIONS } from "@lw/shared";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { coverUrlOf, embeddedCount, toLand } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { LandsManager } from "./_components/lands-manager";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lands.label };

/** /lands: danh sách vùng đất (mỗi vùng là một ngôn ngữ), sửa ngay trên bảng. */
export default async function LandsPage() {
  const session = await requireSection("lands");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lands")
    .select("*, cover:media(secure_url), areas(count)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Không đọc được danh sách vùng đất: ${error.message}`);
  const rows = data.map((row) => ({
    land: toLand(row),
    areaCount: embeddedCount(row.areas),
    coverUrl: coverUrlOf(row),
  }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất" }]} />
      <PageTitle description="Mỗi vùng đất là một ngôn ngữ. Bấm vào tên để quản lý các khu vực bên trong.">
        Vùng đất
      </PageTitle>
      {/* Xóa vùng đất: chỉ admin (database cũng chỉ cho admin). */}
      <LandsManager rows={rows} canDelete={session.role === "admin"} />
    </>
  );
}
