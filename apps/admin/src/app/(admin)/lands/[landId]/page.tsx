import type { Metadata } from "next";
import Link from "next/link";
import { AREA_SCENE_LABELS, SKILL_LABELS } from "@lw/shared";
import { ActiveBadge, Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/card";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { embeddedCount, getLand, toArea } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ landId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireSection("lands");
  const land = await getLand((await params).landId);
  return { title: land.name };
}

/** /lands/[landId]: thông tin vùng đất + danh sách khu vực. Dùng chung quyền của /lands. */
export default async function LandPage({ params }: { params: Params }) {
  await requireSection("lands");
  const { landId } = await params;
  const land = await getLand(landId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*, lessons(count)")
    .eq("land_id", landId)
    .order("unlock_order")
    .order("name");
  if (error) throw new Error(`Không đọc được danh sách khu vực: ${error.message}`);
  const areas = data.map((row) => ({ area: toArea(row), lessonCount: embeddedCount(row.lessons) }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất", href: "/lands" }, { label: land.name }]} />
      <PageTitle description={land.description || undefined}>{land.name}</PageTitle>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card title="Thông tin">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mã ngôn ngữ</dt>
              <dd>
                <Badge tone="muted">{land.languageCode}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Thứ tự mở khóa</dt>
              <dd className="font-medium">{land.unlockOrder}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <ActiveBadge active={land.isActive} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mã vùng</dt>
              <dd className="font-mono text-xs text-slate-500">{land.id}</dd>
            </div>
          </dl>
        </Card>

        <Card title={`Khu vực (${areas.length})`}>
          {areas.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Vùng đất này chưa có khu vực nào.</p>
          ) : (
            <ul className="divide-y divide-secondary">
              {areas.map(({ area, lessonCount }) => (
                <li key={area.id}>
                  <Link
                    href={`/lands/${land.id}/areas/${area.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-right text-xs text-slate-400">
                        {area.unlockOrder}
                      </span>
                      <span className="truncate font-medium">{area.name}</span>
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {AREA_SCENE_LABELS[area.scene]}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge>{SKILL_LABELS[area.skill]}</Badge>
                      <span className="text-xs text-slate-500">{lessonCount} bài</span>
                      <ActiveBadge active={area.isActive} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
