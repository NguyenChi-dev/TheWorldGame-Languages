"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Land } from "@lw/shared";
import { Button, Dialog } from "@lw/ui";
import { ActiveBadge, Badge } from "@/components/badge";
import { cloudinaryThumb } from "@/lib/media-url";
import { DeleteLandDialog } from "./delete-land-dialog";
import { LandForm } from "./land-form";

/** Thông tin vùng đất (kèm ảnh bìa) + nút Sửa, Xóa (chỉ admin). */
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
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows: [string, React.ReactNode][] = [
    [
      "Slug",
      <span key="slug" className="font-mono text-xs">
        {land.slug}
      </span>,
    ],
    [
      "Mã ngôn ngữ",
      <Badge key="code" tone="muted">
        {land.languageCode}
      </Badge>,
    ],
    ["Trạng thái", <ActiveBadge key="active" active={land.isActive} />],
    ["Thứ tự hiển thị", land.sortOrder + 1],
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-secondary bg-white shadow-sm">
      {coverUrl ? (
        // Cloudinary đã cắt / nén theo kích thước, không cần next/image tối ưu lại.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryThumb(coverUrl, 576, 288)}
          alt={`Ảnh bìa ${land.name}`}
          className="aspect-2/1 w-full object-cover"
        />
      ) : (
        <div className="flex aspect-2/1 w-full items-center justify-center bg-linear-to-br from-secondary to-primary/40 font-game text-3xl font-extrabold text-accent/70">
          {land.languageCode.toUpperCase()}
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-game text-base font-bold text-slate-900">Thông tin</h2>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Sửa
            </Button>
            {canDelete ? (
              <Button variant="ghost" size="sm" onClick={() => setDeleting(true)} className="text-red-600">
                Xóa
              </Button>
            ) : null}
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="min-w-0 truncate text-right">{value}</dd>
            </div>
          ))}
        </dl>
        {land.description ? (
          <p className="mt-3 border-t border-secondary pt-3 text-sm text-slate-600">{land.description}</p>
        ) : null}
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title={`Sửa vùng đất "${land.name}"`}>
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
