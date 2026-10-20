import type { Metadata } from "next";
import { AREA_SCENE_LABELS, can } from "@lw/shared";
import { ActiveBadge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/card";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { coverUrlOf, getArea, getLand, getSkills } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { AreaForm } from "../../../_components/area-form";
import { DeleteAreaButton } from "../../../_components/delete-area-dialog";

type Params = Promise<{ landId: string; areaId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireSection("lands");
  const { landId, areaId } = await params;
  const [land, area] = await Promise.all([getLand(landId), getArea(landId, areaId)]);
  return { title: `${area.name} · ${land.name}` };
}

/** /lands/[landId]/areas/[areaId]: sửa / xóa một khu vực. */
export default async function AreaPage({ params }: { params: Params }) {
  const session = await requireSection("lands");
  const { landId, areaId } = await params;
  const [land, area, skills] = await Promise.all([getLand(landId), getArea(landId, areaId), getSkills()]);
  const skill = skills.find((item) => item.id === area.skillId);

  const supabase = await createClient();
  const { data: coverRow } = await supabase
    .from("areas")
    .select("cover:media(secure_url)")
    .eq("id", area.id)
    .maybeSingle();
  const areaCover = coverRow ? coverUrlOf(coverRow) : null;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Vùng đất", href: "/lands" },
          { label: land.name, href: `/lands/${land.id}` },
          { label: area.name },
        ]}
      />
      <PageTitle
        description={`${AREA_SCENE_LABELS[area.scene]} · luyện kỹ năng ${skill?.name ?? "(chưa rõ)"}`}
      >
        {area.name}
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <Card title="Sửa khu vực">
          <AreaForm landId={land.id} area={area} coverUrl={areaCover} skills={skills} />
        </Card>
        <Card title="Trạng thái">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Đang bật</dt>
              <dd>
                <ActiveBadge active={area.isActive} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Thứ tự</dt>
              <dd className="font-medium">{area.unlockOrder + 1}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Bật/tắt và đổi thứ tự ở danh sách khu vực của vùng đất {land.name}.
          </p>
          {can(session.role, "content.delete") ? (
            <div className="mt-4 border-t border-secondary pt-3">
              <DeleteAreaButton area={area} />
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
