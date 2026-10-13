"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Các nút ở chân hộp thoại (Hủy, Lưu...). */
  footer?: ReactNode;
}

/**
 * Hộp thoại dùng thẻ <dialog> gốc của trình duyệt: tự giữ focus bên trong, Esc để đóng,
 * nền phía sau mờ đi và không bấm được.
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <h2 id={titleId} className="text-base font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex size-8 items-center justify-center rounded-lg text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>
      ) : null}
    </dialog>
  );
}
