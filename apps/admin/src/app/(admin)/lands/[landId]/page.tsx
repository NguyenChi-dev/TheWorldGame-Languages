import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
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

/** /lands/[landId]: băng thông tin vùng đất (sửa / xóa được) + danh sách khu vực. Dùng chung quyền của /lands. */
export default async function LandPage({ params }: { params: Params }) {
  const session = await requireSection("lands");
  const { landId } = await params;
  const land = await getLand(landId);

  const supabase = await createClient();
  const [{ data: coverRow }, { data, error }] = await Promise.all([
    supabase.from("lands").select("cover:media(secure_url)").eq("id", land.id).maybeSingle(),
    supabase
      .from("areas")
      .select("*, cover:media(secure_url), lessons(count)")
      .eq("land_id", land.id)
      .order("unlock_order")
      .order("name"),
  ]);
  if (error) throw new Error(`Không đọc được danh sách khu vực: ${error.message}`);
  const rows = data.map((row) => ({
    area: toArea(row),
    lessonCount: embeddedCount(row.lessons),
    coverUrl: coverUrlOf(row),
  }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất", href: "/lands" }, { label: land.name }]} />
      {/* Màn rộng: thẻ vùng đất bên trái, danh sách khu vực bên phải. Màn hẹp: xếp chồng. */}
      <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside>
          <LandInfo
            land={land}
            coverUrl={coverRow ? coverUrlOf(coverRow) : null}
            areaCount={rows.length}
            canDelete={session.role === "admin"}
          />
        </aside>
        <AreasManager landId={land.id} rows={rows} />
      </div>
    </>
  );
}
