"use client";

import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Area } from "@lw/shared";
import { Button, Dialog, useToast } from "@lw/ui";
import { FaIcon } from "@/components/fa-icon";
import { Field, fieldClass } from "@/components/fields";
import { deleteArea } from "../actions";

/** Hộp xác nhận xóa vĩnh viễn khu vực: phải gõ đúng tên khu vực (máy chủ và RLS chỉ cho admin). */
export function DeleteAreaDialog({
  area,
  open,
  onClose,
  onDeleted,
}: {
  area: Area;
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
      const result = await deleteArea(area.id, typed);
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
      title={`Xóa khu vực "${area.name}"?`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirm}
            disabled={pending || typed.trim() !== area.name}
          >
            <FaIcon icon={faTrashCan} />
            {pending ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Thao tác này <strong>không hoàn tác được</strong> và được ghi vào nhật ký. Nếu chỉ muốn ẩn khu vực
          khỏi người chơi, hãy <strong>tắt</strong> nó thay vì xóa.
        </p>
        <Field label={`Gõ tên "${area.name}" để xác nhận`}>
          {(id) => (
            <input
              id={id}
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              className={fieldClass}
            />
          )}
        </Field>
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </Dialog>
  );
}

/** Nút "Xóa khu vực" (trang khu vực): mở hộp xác nhận, xóa xong quay về trang vùng đất. */
export function DeleteAreaButton({ area }: { area: Area }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <FaIcon icon={faTrashCan} />
        Xóa khu vực
      </Button>
      {open ? (
        <DeleteAreaDialog
          area={area}
          open
          onClose={() => setOpen(false)}
          onDeleted={() => router.push(`/lands/${area.landId}`)}
        />
      ) : null}
    </>
  );
}
