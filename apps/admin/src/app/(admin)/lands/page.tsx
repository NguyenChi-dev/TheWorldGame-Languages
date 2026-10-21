import type { Metadata } from "next";
import { ADMIN_SECTIONS, can } from "@lw/shared";
import { PageHeader, TabContent, sectionTabs } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { requireSection } from "@/lib/auth";
import { coverUrlOf, embeddedCount, toLand, toSkill } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { LandsManager } from "./_components/lands-manager";
import { SkillsManager } from "./_components/skills-manager";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lands.label };

/**
 * /lands: Vùng đất (ngôn ngữ) · Khu vực (kỹ năng) · Bật/tắt và thứ tự mở khóa.
 * Khu vực của mỗi vùng đất nằm trong trang /lands/[landId]; tab "Khu vực (kỹ năng)" quản lý danh sách kỹ năng
 * dùng chung (trước đây là /lands/skills, đường dẫn cũ vẫn mở được).
 */
export default async function LandsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSection("lands");
  const { active, bar } = sectionTabs("lands", (await searchParams).tab);
  // Xóa vùng đất / kỹ năng: chỉ admin (database cũng chỉ cho admin, kèm xác thực hai lớp).
  const canDelete = can(session.role, "content.delete");
  const supabase = await createClient();

  if (active?.key === "skills") {
    const { data, error } = await supabase
      .from("skills")
      .select("*, areas(count)")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(`Không đọc được kỹ năng luyện tập: ${error.message}`);
    const rows = data.map((row) => ({ skill: toSkill(row), areaCount: embeddedCount(row.areas) }));
    return (
      <>
        <PageHeader section="lands" />
        {bar}
        <TabContent tab={active?.key}>
          <p className="mb-3 text-sm text-slate-500">
            Mỗi khu vực luyện một kỹ năng. Danh sách kỹ năng dùng chung cho mọi vùng đất; khu vực của từng
            vùng đất nằm trong trang của vùng đất đó.
          </p>
          <SkillsManager rows={rows} canDelete={canDelete} />
        </TabContent>
      </>
    );
  }

  if (active?.key === "unlock") {
    return (
      <>
        <PageHeader section="lands" />
        {bar}
        <TabContent tab={active?.key}>
          <PlaceholderPanel title={active.label} message="Đã có trong danh sách">
            Bật/tắt bằng công tắc và kéo thả để đổi thứ tự ngay ở tab “Vùng đất (ngôn ngữ)”. Thứ tự mở khóa
            khu vực đổi trong trang của từng vùng đất.
          </PlaceholderPanel>
        </TabContent>
      </>
    );
  }

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
      <PageHeader section="lands" />
      {bar}
      <TabContent tab={active?.key}>
        <LandsManager rows={rows} canDelete={canDelete} />
      </TabContent>
    </>
  );
}
