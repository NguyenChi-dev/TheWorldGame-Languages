import { can } from "@lw/shared";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { embeddedCount, toSkill } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { SkillsManager } from "../_components/skills-manager";

export const metadata: Metadata = { title: "Kỹ năng luyện tập" };

/** /lands/skills: kỹ năng luyện tập dùng chung mọi vùng đất. Dùng chung quyền của /lands. */
export default async function SkillsPage() {
  const session = await requireSection("lands");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skills")
    .select("*, areas(count)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Không đọc được kỹ năng luyện tập: ${error.message}`);
  const rows = data.map((row) => ({ skill: toSkill(row), areaCount: embeddedCount(row.areas) }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất", href: "/lands" }, { label: "Kỹ năng luyện tập" }]} />
      <PageTitle description="Mỗi khu vực luyện một kỹ năng. Danh sách này dùng chung cho mọi vùng đất.">
        Kỹ năng luyện tập
      </PageTitle>
      {/* Xóa kỹ năng: chỉ admin (database cũng chỉ cho admin). */}
      <SkillsManager rows={rows} canDelete={can(session.role, "content.delete")} />
    </>
  );
}
