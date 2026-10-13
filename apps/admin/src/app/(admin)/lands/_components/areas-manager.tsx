"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AREA_SCENE_LABELS, SKILL_LABELS, type Area } from "@lw/shared";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { Badge } from "@/components/badge";
import { SortableList } from "@/components/sortable-list";
import { reorderAreas, setAreaActive } from "../actions";
import { AreaForm } from "./area-form";

export interface AreaRow {
  area: Area;
  lessonCount: number;
}

/** Danh sách khu vực của một vùng đất: kéo thả đổi thứ tự MỞ KHÓA, công tắc bật/tắt, thêm khu vực. */
export function AreasManager({ landId, rows }: { landId: string; rows: AreaRow[] }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Record<string, boolean>>({});

  async function onReorder(next: AreaRow[]) {
    const result = await reorderAreas(
      landId,
      next.map((row) => row.area.id),
    );
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
    return result.ok;
  }

  function toggle(area: Area, value: boolean) {
    setActive((map) => ({ ...map, [area.id]: value }));
    startTransition(async () => {
      const result = await setAreaActive(area.id, value);
      if (result.ok) toast.success(result.message);
      else {
        toast.error(result.error);
        setActive((map) => ({ ...map, [area.id]: !value }));
      }
    });
  }

  return (
    <section className="min-w-0 rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-game text-base font-bold text-slate-900">Khu vực ({rows.length})</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          + Thêm khu vực
        </Button>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Kéo ⠿ (hoặc bấm ↑ ↓) để đổi thứ tự mở khóa: khu vực trên cùng mở trước.
      </p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Vùng đất này chưa có khu vực nào.</p>
      ) : (
        <SortableList
          items={rows}
          getId={(row) => row.area.id}
          onReorder={onReorder}
          disabled={pending}
          renderItem={({ area, lessonCount }, index) => {
            const isActive = active[area.id] ?? area.isActive;
            return (
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-400">
                  {index + 1}
                </span>
                <Link href={`/lands/${landId}/areas/${area.id}`} className="min-w-0 flex-1 hover:text-accent">
                  <span className="block truncate text-sm font-semibold">{area.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {AREA_SCENE_LABELS[area.scene]} · {lessonCount} bài học
                  </span>
                </Link>
                <Badge>{SKILL_LABELS[area.skill]}</Badge>
                <Switch
                  checked={isActive}
                  onCheckedChange={(value) => toggle(area, value)}
                  label={`${isActive ? "Tắt" : "Bật"} khu vực ${area.name}`}
                  disabled={pending}
                />
              </div>
            );
          }}
        />
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Thêm khu vực">
        {adding ? <AreaForm landId={landId} onDone={() => setAdding(false)} /> : null}
      </Dialog>
    </section>
  );
}
