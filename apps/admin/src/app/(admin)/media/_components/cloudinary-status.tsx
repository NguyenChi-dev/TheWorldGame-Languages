"use client";

import { useTransition } from "react";
import { Button, useToast } from "@lw/ui";
import { checkCloudinary } from "../actions";

/** Thẻ trạng thái kết nối Cloudinary + nút kiểm tra (gọi Admin API ping khi bấm). */
export function CloudinaryStatus({ cloudName }: { cloudName: string | null }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-game text-base font-bold text-slate-900">Kho lưu trữ Cloudinary</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {cloudName ? (
            <>
              Đã cấu hình · cloud <span className="font-mono text-slate-700">{cloudName}</span>
            </>
          ) : (
            "Chưa cấu hình: thêm CLOUDINARY_URL vào apps/admin/.env.local rồi khởi động lại."
          )}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        disabled={!cloudName || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkCloudinary();
            if (result.ok) toast.success(result.message);
            else toast.error(result.error);
          })
        }
      >
        {pending ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
      </Button>
    </section>
  );
}
