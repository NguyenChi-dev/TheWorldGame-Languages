import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { coverUrlOf, embeddedCount, getLand, toArea } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { AreasManager } from "../_components/areas-manager";
import { LandInfo } from "../_components/land-info";

type Params = Promise<{ landId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireSection("lands");
  const land = await getLand((await params).landId);
  return { title: land.name };
}

/** /lands/[landId]: thông tin vùng đất (sửa được) + danh sách khu vực. Dùng chung quyền của /lands. */
export default async function LandPage({ params }: { params: Params }) {
  const session = await requireSection("lands");
  const { landId } = await params;
  const land = await getLand(landId);

  const supabase = await createClient();
  const { data: coverRow } = await supabase
    .from("lands")
    .select("cover:media(secure_url)")
    .eq("id", land.id)
    .maybeSingle();
  const landCover = coverRow ? coverUrlOf(coverRow) : null;
  const { data, error } = await supabase
    .from("areas")
    .select("*, cover:media(secure_url), lessons(count)")
    .eq("land_id", land.id)
    .order("unlock_order")
    .order("name");
  if (error) throw new Error(`Không đọc được danh sách khu vực: ${error.message}`);
  const rows = data.map((row) => ({ area: toArea(row), lessonCount: embeddedCount(row.lessons) }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất", href: "/lands" }, { label: land.name }]} />
      <PageTitle>{land.name}</PageTitle>
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <LandInfo
          land={land}
          coverUrl={landCover}
          areaCount={rows.length}
          canDelete={session.role === "admin"}
        />
        <AreasManager landId={land.id} rows={rows} />
      </div>
    </>
  );
}
