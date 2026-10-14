"use client";

import {
  faCircle,
  faCircleCheck,
  faExpand,
  faEyeSlash,
  faHashtag,
  faLanguage,
  faMapLocationDot,
  faPen,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Land } from "@lw/shared";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { CoverImage } from "@/components/cover-image";
import { FaIcon } from "@/components/fa-icon";
import { cloudinaryFit } from "@/lib/media-url";
import { setLandActive } from "../actions";
import { DeleteLandDialog } from "./delete-land-dialog";
import { LandForm } from "./land-form";

/**
 * Thẻ hồ sơ vùng đất (cột trái trang chi tiết): ảnh bìa hiện trọn theo đúng tỉ lệ (không cắt, không viền trống),
 * tên, mô tả, công tắc bật cho người chơi, số liệu, danh sách "sẵn sàng" và nút Sửa / Xóa (Xóa chỉ admin).
 */
export function LandInfo({
  land,
  coverUrl,
  areaCount,
  canDelete,
}: {
  land: Land;
  coverUrl: string | null;
  areaCount: number;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [active, setActive] = useState(land.isActive);
  const [source, setSource] = useState(land.isActive);
  const [pending, startTransition] = useTransition();

  // Máy chủ trả trạng thái mới (sau khi lưu / tải lại) thì dùng giá trị đó.
  if (land.isActive !== source) {
    setSource(land.isActive);
    setActive(land.isActive);
  }

  function toggle(value: boolean) {
    setActive(value);
    startTransition(async () => {
      const result = await setLandActive(land.id, value);
      if (result.ok) toast.success(result.message);
      else {
        toast.error(result.error);
        setActive(!value);
      }
    });
  }

  // Những thứ người chơi sẽ thấy: thiếu mục nào thì vùng đất trông trống trải trong game.
  const checklist = [
    { done: Boolean(coverUrl), label: "Có ảnh bìa" },
    { done: Boolean(land.description), label: "Có mô tả" },
    { done: areaCount > 0, label: "Có ít nhất 1 khu vực" },
    { done: active, label: "Đang bật cho người chơi" },
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  const stat = "flex flex-col items-center gap-0.5 rounded-xl bg-background px-2 py-2.5 text-center";

  return (
    <section className="overflow-hidden rounded-2xl border border-secondary bg-white shadow-sm">
      <div className="relative">
        {coverUrl ? (
          <>
            <CoverImage
              src={cloudinaryFit(coverUrl, 900, 1600)}
              alt={`Ảnh bìa ${land.name}`}
              className="block h-auto max-h-112 w-full object-cover lg:max-h-none"
              fallback={
                <div className="flex aspect-video w-full items-center justify-center bg-red-50 px-6 text-center text-sm font-semibold text-red-700">
                  Ảnh bìa không còn trên Cloudinary. Bấm Sửa để tải ảnh khác.
                </div>
              }
            />
            <a
              href={coverUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-accent"
            >
              <FaIcon icon={faExpand} />
              Ảnh gốc
            </a>
          </>
        ) : (
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-linear-to-br from-secondary via-primary/50 to-accent">
            <span className="font-game text-6xl font-extrabold tracking-wide text-white/90 drop-shadow">
              {land.languageCode.toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${
            active ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-600"
          }`}
        >
          <FaIcon icon={active ? faCircleCheck : faEyeSlash} className="mr-1" />
          {active ? "Đang bật" : "Đang tắt"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h1 className="font-game text-2xl font-extrabold leading-tight text-slate-900">{land.name}</h1>
          <p className="font-mono text-xs text-slate-400">/lands/{land.slug}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {land.description || <span className="italic text-slate-400">Chưa có mô tả.</span>}
          </p>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-secondary px-3 py-2.5">
          <span>
            <span className="block text-sm font-semibold text-slate-800">Cho người chơi</span>
            <span className="block text-xs text-slate-500">
              {active ? "Người chơi đang vào được vùng này" : "Người chơi chưa thấy vùng này"}
            </span>
          </span>
          <Switch
            checked={active}
            onCheckedChange={toggle}
            label={`${active ? "Tắt" : "Bật"} vùng đất ${land.name}`}
            disabled={pending}
          />
        </label>

        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div className={stat}>
            <FaIcon icon={faMapLocationDot} className="text-primary" />
            <dt className="order-last text-slate-500">Khu vực</dt>
            <dd className="font-game text-lg font-bold leading-none text-slate-800">{areaCount}</dd>
          </div>
          <div className={stat}>
            <FaIcon icon={faLanguage} className="text-primary" />
            <dt className="order-last text-slate-500">Ngôn ngữ</dt>
            <dd className="font-mono text-lg font-bold leading-none text-slate-800">{land.languageCode}</dd>
          </div>
          <div className={stat}>
            <FaIcon icon={faHashtag} className="text-primary" />
            <dt className="order-last text-slate-500">Thứ tự</dt>
            <dd className="font-game text-lg font-bold leading-none text-slate-800">{land.sortOrder + 1}</dd>
          </div>
        </dl>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Sẵn sàng cho người chơi</span>
            <span className="font-semibold text-slate-400">
              {doneCount}/{checklist.length}
            </span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="space-y-1 text-xs">
            {checklist.map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-2 ${item.done ? "text-slate-600" : "text-slate-400"}`}
              >
                <FaIcon
                  icon={item.done ? faCircleCheck : faCircle}
                  className={item.done ? "text-emerald-500" : "text-[8px] text-slate-300"}
                  fixedWidth
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 border-t border-secondary pt-4">
          <Button onClick={() => setEditing(true)} className="flex-1">
            <FaIcon icon={faPen} />
            Sửa vùng đất
          </Button>
          {canDelete ? (
            <Button
              variant="ghost"
              onClick={() => setDeleting(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label={`Xóa vùng đất ${land.name}`}
            >
              <FaIcon icon={faTrashCan} />
              Xóa
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={`Sửa vùng đất "${land.name}"`}
        size="lg"
      >
        {editing ? <LandForm land={land} coverUrl={coverUrl} onDone={() => setEditing(false)} /> : null}
      </Dialog>
      {deleting ? (
        <DeleteLandDialog
          land={land}
          areaCount={areaCount}
          open
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/lands")}
        />
      ) : null}
    </section>
  );
}
