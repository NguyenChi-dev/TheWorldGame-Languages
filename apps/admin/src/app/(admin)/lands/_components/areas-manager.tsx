"use client";

import { faGripVertical, faPen, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState, useTransition } from "react";
import { AREA_SCENE_LABELS, type Area, type Skill } from "@lw/shared";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { CoverImage } from "@/components/cover-image";
import { SCENE_ICONS } from "@/components/content-icons";
import { FaIcon } from "@/components/fa-icon";
import { SkillBadge } from "@/components/skill-badge";
import { SortableList } from "@/components/sortable-list";
import { cloudinaryThumb } from "@/lib/media-url";
import { reorderAreas, setAreaActive } from "../actions";
import { AreaForm } from "./area-form";
import { DeleteAreaDialog } from "./delete-area-dialog";

export interface AreaRow {
  area: Area;
  coverUrl: string | null;
}

const iconButton =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-secondary hover:text-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Ảnh nhỏ của khu vực; chưa có ảnh (hoặc ảnh mất trên Cloudinary) thì hiện icon của mẫu cảnh. */
function AreaThumb({ area, coverUrl }: { area: Area; coverUrl: string | null }) {
  const placeholder = (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
      <FaIcon icon={SCENE_ICONS[area.scene]} className="text-lg" />
    </span>
  );
  if (!coverUrl) return placeholder;
  return (
    <CoverImage
      src={cloudinaryThumb(coverUrl, 96)}
      alt={`Ảnh khu vực ${area.name}`}
      className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-secondary"
      fallback={placeholder}
    />
  );
}

/**
 * Danh sách khu vực của một vùng đất: thêm, sửa (hộp thoại), xóa (chỉ admin), kéo thả đổi thứ tự,
 * công tắc bật/tắt. Bấm tên khu vực để mở trang khu vực.
 */
export function AreasManager({
  landId,
  rows,
  skills,
  canDelete,
}: {
  landId: string;
  rows: AreaRow[];
  skills: Skill[];
  canDelete: boolean;
}) {
  const toast = useToast();
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AreaRow | null>(null);
  const [deleting, setDeleting] = useState<AreaRow | null>(null);
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
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-game text-lg font-bold text-slate-900">Khu vực ({rows.length})</h2>
          <p className="text-xs text-slate-500">
            Kéo <FaIcon icon={faGripVertical} /> (hoặc bấm ↑ ↓) để đổi thứ tự: khu vực trên cùng đứng đầu.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <FaIcon icon={faPlus} />
          Thêm khu vực
        </Button>
      </div>

      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 py-8 text-center transition hover:border-primary hover:bg-secondary/40"
        >
          <span className="font-semibold text-slate-700">Vùng đất này chưa có khu vực nào</span>
          <span className="text-xs text-slate-500">
            Bấm để thêm khu vực đầu tiên (nông trại, chợ, công viên...)
          </span>
        </button>
      ) : (
        <SortableList
          items={rows}
          getId={(row) => row.area.id}
          onReorder={onReorder}
          disabled={pending}
          renderItem={(row, index) => {
            const { area, coverUrl } = row;
            const isActive = active[area.id] ?? area.isActive;
            return (
              <div className="flex items-center gap-3 rounded-xl px-1 py-0.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <AreaThumb area={area} coverUrl={coverUrl} />
                <Link href={`/lands/${landId}/areas/${area.id}`} className="min-w-0 flex-1 hover:text-accent">
                  <span className="block truncate text-sm font-semibold">{area.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {AREA_SCENE_LABELS[area.scene]}
                  </span>
                </Link>
                <SkillBadge skill={skillById.get(area.skillId)} />
                <Switch
                  checked={isActive}
                  onCheckedChange={(value) => toggle(area, value)}
                  label={`${isActive ? "Tắt" : "Bật"} khu vực ${area.name}`}
                  disabled={pending}
                />
                <span className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className={iconButton}
                    aria-label={`Sửa khu vực ${area.name}`}
                    title="Sửa"
                  >
                    <FaIcon icon={faPen} />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(row)}
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                      aria-label={`Xóa khu vực ${area.name}`}
                      title="Xóa"
                    >
                      <FaIcon icon={faTrashCan} />
                    </button>
                  ) : null}
                </span>
              </div>
            );
          }}
        />
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Thêm khu vực"
        description="Mỗi khu vực luyện một kỹ năng và dùng một mẫu cảnh 3D."
        size="lg"
      >
        {adding ? <AreaForm landId={landId} skills={skills} onDone={() => setAdding(false)} /> : null}
      </Dialog>
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Sửa khu vực "${editing.area.name}"` : "Sửa khu vực"}
        size="lg"
      >
        {editing ? (
          <AreaForm
            key={editing.area.id}
            landId={landId}
            area={editing.area}
            coverUrl={editing.coverUrl}
            skills={skills}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
      {deleting ? <DeleteAreaDialog area={deleting.area} open onClose={() => setDeleting(null)} /> : null}
    </section>
  );
}
