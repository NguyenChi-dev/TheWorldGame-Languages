import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_SECTIONS } from "@lw/shared";
import { ActiveBadge, Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageTitle } from "@/components/page-title";
import { requireSection } from "@/lib/auth";
import { embeddedCount, toLand } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: ADMIN_SECTIONS.lands.label };

/** /lands: danh sách vùng đất (mỗi vùng là một ngôn ngữ). */
export default async function LandsPage() {
  await requireSection("lands");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lands")
    .select("*, areas(count)")
    .order("unlock_order")
    .order("name");
  if (error) throw new Error(`Không đọc được danh sách vùng đất: ${error.message}`);
  const lands = data.map((row) => ({ land: toLand(row), areaCount: embeddedCount(row.areas) }));

  return (
    <>
      <Breadcrumb items={[{ label: "Vùng đất" }]} />
      <PageTitle description="Mỗi vùng đất là một ngôn ngữ. Bấm vào để xem các khu vực và bài học bên trong.">
        Vùng đất
      </PageTitle>

      {lands.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-primary/50 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Chưa có vùng đất nào.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lands.map(({ land, areaCount }) => (
            <Link
              key={land.id}
              href={`/lands/${land.id}`}
              className="rounded-2xl border border-secondary bg-white p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-game text-lg font-bold text-slate-900">{land.name}</span>
                <ActiveBadge active={land.isActive} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {land.description || "Chưa có mô tả."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Badge tone="muted">{land.languageCode}</Badge>
                <span>{areaCount} khu vực</span>
                <span>· Thứ tự mở khóa {land.unlockOrder}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
