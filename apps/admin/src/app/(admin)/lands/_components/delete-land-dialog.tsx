"use client";

import { useState, useTransition } from "react";
import type { Land } from "@lw/shared";
import { Button, Dialog, useToast } from "@lw/ui";
import { Field, fieldClass } from "@/components/fields";
import { deleteLand } from "../actions";

/**
 * Hộp xác nhận xóa vĩnh viễn vùng đất: phải gõ đúng slug.
 * Máy chủ và database vẫn tự chặn nếu vùng đất còn khu vực / từ vựng / dữ liệu người chơi.
 */
export function DeleteLandDialog({
  land,
  areaCount,
  open,
  onClose,
  onDeleted,
}: {
  land: Land;
  areaCount: number;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setTyped("");
    setError(null);
    onClose();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteLand(land.id, typed);
      if (result.ok) {
        toast.success(result.message);
        close();
        onDeleted?.();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={`Xóa vùng đất "${land.name}"?`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirm}
            disabled={pending || typed.trim() !== land.slug}
          >
            {pending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Thao tác này <strong>không hoàn tác được</strong> và được ghi vào nhật ký. Nếu chỉ muốn ẩn vùng đất
          khỏi người chơi, hãy <strong>tắt</strong> nó thay vì xóa.
        </p>
        {areaCount > 0 ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
            Vùng đất đang có {areaCount} khu vực nên sẽ không xóa được.
          </p>
        ) : null}
        <Field label={`Gõ slug "${land.slug}" để xác nhận`}>
          {(id) => (
            <input
              id={id}
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              className={`${fieldClass} font-mono`}
            />
          )}
        </Field>
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </Dialog>
  );
}
