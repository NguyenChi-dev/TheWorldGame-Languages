"use client";

import { useState, useTransition } from "react";
import { Button, Dialog, Switch, useToast } from "@lw/ui";
import { setRequireMfa } from "./actions";

/**
 * Công tắc "Bắt buộc xác thực hai lớp". Bật thì hỏi xác nhận trước, vì nhân viên chưa thiết lập sẽ phải
 * quét mã QR ở lần đăng nhập tới.
 */
export function MfaSwitch({
  required,
  canChange,
  staffWithoutMfa,
}: {
  required: boolean;
  canChange: boolean;
  staffWithoutMfa: number | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<boolean | null>(null);

  const apply = (value: boolean) =>
    startTransition(async () => {
      const result = await setRequireMfa(value);
      setConfirming(null);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });

  return (
    <>
      <Switch
        checked={required}
        onCheckedChange={(value) => setConfirming(value)}
        label={required ? "Tắt bắt buộc xác thực hai lớp" : "Bật bắt buộc xác thực hai lớp"}
        disabled={!canChange || pending}
      />
      {confirming !== null ? (
        <Dialog
          open
          onClose={() => setConfirming(null)}
          title={confirming ? "Bắt buộc xác thực hai lớp?" : "Tắt bắt buộc xác thực hai lớp?"}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={pending}>
                Hủy
              </Button>
              <Button size="sm" disabled={pending} onClick={() => apply(confirming)}>
                {pending ? "Đang lưu..." : confirming ? "Bật" : "Tắt"}
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-slate-600">
            {confirming
              ? staffWithoutMfa
                ? `${staffWithoutMfa} nhân viên chưa thiết lập sẽ phải quét mã QR ở lần đăng nhập tới.`
                : "Mọi nhân viên phải nhập mã từ ứng dụng xác thực mỗi lần đăng nhập."
              : "Nhân viên vào được trang quản trị chỉ bằng mật khẩu. Đổi vai trò, quản lý tài khoản và xóa nội dung vẫn cần xác thực hai lớp."}
          </p>
        </Dialog>
      ) : null}
    </>
  );
}
