"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Land } from "@lw/shared";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { Badge } from "@/components/badge";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { SortableList } from "@/components/sortable-list";
import { cloudinaryThumb } from "@/lib/media-url";
import { reorderLands, setLandActive } from "../actions";
import { DeleteLandDialog } from "./delete-land-dialog";
import { LandForm } from "./land-form";

export interface LandRow {
  land: Land;
  areaCount: number;
  coverUrl: string | null;
}

/** Ảnh bìa thu nhỏ; chưa có ảnh thì hiện mã ngôn ngữ. */
function CoverTile({ land, coverUrl }: { land: Land; coverUrl: string | null }) {
  if (coverUrl) {
    return (
      // Cloudinary đã cắt / nén theo kích thước, không cần next/image tối ưu lại.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cloudinaryThumb(coverUrl, 96)}
        alt={`Ảnh bìa ${land.name}`}
        className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-secondary"
      />
    );
  }
  return (
    <span
      title="Chưa có ảnh bìa"
      className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent font-game text-sm font-bold text-white"
    >
      {land.languageCode.toUpperCase()}
    </span>
  );
}

const iconButton =
  "flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-secondary hover:text-accent";

/**
 * Bảng vùng đất, đủ CRUD: thêm, xem (bấm tên), sửa, xóa (chỉ admin), bật/tắt,
 * kéo thả đổi thứ tự hiển thị.
 */
export function LandsManager({ rows, canDelete }: { rows: LandRow[]; canDelete: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LandRow | null>(null);
  const [deleting, setDeleting] = useState<LandRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Record<string, boolean>>({});

  async function onReorder(next: LandRow[]) {
    const result = await reorderLands(next.map((row) => row.land.id));
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
    return result.ok;
  }

  function toggle(land: Land, value: boolean) {
    setActive((map) => ({ ...map, [land.id]: value }));
    startTransition(async () => {
      const result = await setLandActive(land.id, value);
      if (result.ok) toast.success(result.message);
      else {
        toast.error(result.error);
        setActive((map) => ({ ...map, [land.id]: !value }));
      }
    });
  }

  return (
    <section className="rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-game text-base font-bold text-slate-900">Danh sách vùng đất ({rows.length})</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          + Thêm vùng đất
        </Button>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Kéo ⠿ (hoặc bấm ↑ ↓) để đổi thứ tự hiển thị. Vùng đang bật thì người chơi vào được ngay, không cần mở
        khóa.
      </p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Chưa có vùng đất nào.</p>
      ) : (
        <SortableList
          items={rows}
          getId={(row) => row.land.id}
          onReorder={onReorder}
          disabled={pending}
          renderItem={(row) => {
            const { land, areaCount, coverUrl } = row;
            const isActive = active[land.id] ?? land.isActive;
            return (
              <div className="flex items-center gap-3">
                <CoverTile land={land} coverUrl={coverUrl} />
                <Link href={`/lands/${land.id}`} className="min-w-0 flex-1 hover:text-accent">
                  <span className="block truncate text-sm font-semibold">{land.name}</span>
                  <span className="block truncate font-mono text-xs text-slate-400">{land.slug}</span>
                </Link>
                <Badge tone="muted">{land.languageCode}</Badge>
                <span className="hidden w-20 text-right text-xs text-slate-500 sm:inline">
                  {areaCount} khu vực
                </span>
                <Switch
                  checked={isActive}
                  onCheckedChange={(value) => toggle(land, value)}
                  label={`${isActive ? "Tắt" : "Bật"} vùng đất ${land.name}`}
                  disabled={pending}
                />
                <span className="flex items-center">
                  <button
                    type="button"
                    aria-label={`Sửa vùng đất ${land.name}`}
                    title="Sửa"
                    onClick={() => setEditing(row)}
                    className={iconButton}
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      aria-label={`Xóa vùng đất ${land.name}`}
                      title="Xóa"
                      onClick={() => setDeleting(row)}
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  ) : null}
                </span>
              </div>
            );
          }}
        />
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Thêm vùng đất">
        {adding ? <LandForm onDone={() => setAdding(false)} /> : null}
      </Dialog>
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Sửa vùng đất "${editing.land.name}"` : "Sửa vùng đất"}
      >
        {editing ? (
          <LandForm
            key={editing.land.id}
            land={editing.land}
            coverUrl={editing.coverUrl}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
      {deleting ? (
        <DeleteLandDialog
          key={deleting.land.id}
          land={deleting.land}
          areaCount={deleting.areaCount}
          open
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}
