"use client";

import {
  faArrowLeft,
  faArrowRight,
  faCircleCheck,
  faEyeSlash,
  faGripVertical,
  faLanguage,
  faMapLocationDot,
  faPen,
  faPlus,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Land } from "@lw/shared";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { CoverImage } from "@/components/cover-image";
import { FaIcon } from "@/components/fa-icon";
import { cloudinaryThumb } from "@/lib/media-url";
import { SortableList } from "@/components/sortable-list";
import { reorderLands, setLandActive } from "../actions";
import { DeleteLandDialog } from "./delete-land-dialog";
import { LandForm } from "./land-form";

export interface LandRow {
  land: Land;
  areaCount: number;
  coverUrl: string | null;
}

/**
 * Ảnh bìa trên thẻ: phủ kín khung 4:3 (không viền trống). Cloudinary tự chọn vùng có chủ thể chính (g_auto)
 * để phần bị cắt ít quan trọng nhất; muốn xem trọn ảnh thì mở trang chi tiết. Chưa có ảnh: nền gradient + mã ngôn ngữ. Ảnh mất trên Cloudinary: báo đỏ. */
function CardCover({ land, coverUrl }: { land: Land; coverUrl: string | null }) {
  const placeholder = (
    <div className="flex size-full items-center justify-center bg-linear-to-br from-secondary via-primary/40 to-accent/70">
      <span className="font-game text-4xl font-extrabold tracking-wide text-white/90 drop-shadow">
        {land.languageCode.toUpperCase()}
      </span>
    </div>
  );
  if (!coverUrl) return placeholder;
  return (
    <CoverImage
      src={cloudinaryThumb(coverUrl, 800, 600)}
      alt={`Ảnh bìa ${land.name}`}
      className="size-full object-cover transition duration-300 group-hover:scale-105"
      fallback={
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-red-50 px-4 text-center">
          <span className="text-sm font-semibold text-red-700">Ảnh bìa không còn trên Cloudinary</span>
          <span className="text-xs text-red-600">Bấm Sửa để tải ảnh khác</span>
        </div>
      }
    />
  );
}

const iconButton =
  "flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-secondary hover:text-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:invisible";

/**
 * Danh sách vùng đất dạng lưới thẻ, đủ CRUD: thêm, xem (bấm thẻ), sửa, xóa (chỉ admin), bật/tắt,
 * kéo thả (hoặc nút mũi tên) để đổi thứ tự hiển thị.
 */
export function LandsManager({ rows, canDelete }: { rows: LandRow[]; canDelete: boolean }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LandRow | null>(null);
  const [deleting, setDeleting] = useState<LandRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Record<string, boolean>>({});
  const activeCount = rows.filter((row) => active[row.land.id] ?? row.land.isActive).length;

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

  const addCard = (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-white/60 p-6 text-center transition hover:border-primary hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-lg text-accent">
        <FaIcon icon={faPlus} />
      </span>
      <span className="font-game text-base font-bold text-slate-800">Thêm vùng đất</span>
      <span className="max-w-52 text-xs text-slate-500">
        Mỗi vùng đất là một ngôn ngữ người chơi có thể học.
      </span>
    </button>
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-secondary">
            {rows.length} vùng đất
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {activeCount} đang bật
          </span>
          <span className="hidden text-xs text-slate-500 sm:inline">
            Kéo <FaIcon icon={faGripVertical} /> để đổi thứ tự. Vùng đang bật thì người chơi vào được ngay.
          </span>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <FaIcon icon={faPlus} />
          Thêm vùng đất
        </Button>
      </div>

      <SortableList
        variant="grid"
        items={rows}
        getId={(row) => row.land.id}
        onReorder={onReorder}
        disabled={pending}
        trailing={addCard}
        renderItem={(row, index, controls) => {
          const { land, areaCount, coverUrl } = row;
          const isActive = active[land.id] ?? land.isActive;
          return (
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-secondary bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Link
                href={`/lands/${land.id}`}
                className="relative block aspect-4/3 overflow-hidden bg-slate-100"
                aria-label={`Mở vùng đất ${land.name}`}
              >
                <CardCover land={land} coverUrl={coverUrl} />
                <span className="absolute left-2 top-2 rounded-md bg-slate-900/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  #{index + 1}
                </span>
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${
                    isActive ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-500"
                  }`}
                >
                  <FaIcon icon={isActive ? faCircleCheck : faEyeSlash} className="mr-1" />
                  {isActive ? "Đang bật" : "Đang tắt"}
                </span>
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/lands/${land.id}`} className="min-w-0 hover:text-accent">
                    <h3 className="truncate font-game text-lg font-bold leading-tight text-slate-900">
                      {land.name}
                    </h3>
                    <p className="truncate font-mono text-xs text-slate-400">{land.slug}</p>
                  </Link>
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                    <FaIcon icon={faLanguage} className="mr-1 text-slate-400" />
                    {land.languageCode}
                  </span>
                </div>
                <p className="line-clamp-2 min-h-10 text-sm text-slate-500">
                  {land.description || <span className="italic text-slate-400">Chưa có mô tả</span>}
                </p>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <FaIcon icon={faMapLocationDot} className="text-primary" />
                  {areaCount} khu vực
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-secondary bg-background/50 px-3 py-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Switch
                    checked={isActive}
                    onCheckedChange={(value) => toggle(land, value)}
                    label={`${isActive ? "Tắt" : "Bật"} vùng đất ${land.name}`}
                    disabled={pending}
                  />
                  Cho người chơi
                </label>
                <div className="flex items-center">
                  <span className="text-slate-300">{controls.handle}</span>
                  <button
                    type="button"
                    aria-label="Đưa lên trước"
                    title="Đưa lên trước"
                    disabled={!controls.canMoveBack}
                    onClick={controls.moveBack}
                    className={iconButton}
                  >
                    <FaIcon icon={faArrowLeft} />
                  </button>
                  <button
                    type="button"
                    aria-label="Đưa ra sau"
                    title="Đưa ra sau"
                    disabled={!controls.canMoveForward}
                    onClick={controls.moveForward}
                    className={iconButton}
                  >
                    <FaIcon icon={faArrowRight} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Sửa vùng đất ${land.name}`}
                    title="Sửa"
                    onClick={() => setEditing(row)}
                    className={iconButton}
                  >
                    <FaIcon icon={faPen} />
                  </button>
                  {canDelete ? (
                    <button
                      type="button"
                      aria-label={`Xóa vùng đất ${land.name}`}
                      title="Xóa"
                      onClick={() => setDeleting(row)}
                      className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
                    >
                      <FaIcon icon={faTrashCan} />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        }}
      />

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Thêm vùng đất"
        description="Mỗi vùng đất là một ngôn ngữ. Sau khi tạo, thêm khu vực bên trong rồi bật cho người chơi."
        size="lg"
      >
        {adding ? <LandForm onDone={() => setAdding(false)} /> : null}
      </Dialog>
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Sửa vùng đất "${editing.land.name}"` : "Sửa vùng đất"}
        size="lg"
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
