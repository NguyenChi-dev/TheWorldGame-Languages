"use client";

import { faFloppyDisk, faLock } from "@fortawesome/free-solid-svg-icons";
import { useActionState } from "react";
import { updatePassword } from "@/app/(world)/login/actions";
import type { ActionState } from "@/lib/action-state";
import { Notice, SubmitButton, WoodField } from "./auth-panel";

/** Form đặt mật khẩu mới (trang /reset-password). Lưu xong vào thẳng game. */
export function ResetPasswordForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePassword, {});
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="wood-carve font-poly text-[1.65rem] leading-tight sm:text-4xl">Mật khẩu mới</h1>
        <p className="wood-label mt-1 font-game text-sm font-semibold">
          {email ? `Đặt mật khẩu mới cho ${email}.` : "Đặt mật khẩu mới cho tài khoản của bạn."}
        </p>
      </div>
      <form action={action} className="space-y-3.5">
        <WoodField
          label="Mật khẩu mới"
          name="password"
          icon={faLock}
          type="password"
          autoComplete="new-password"
          placeholder="Từ 8 ký tự"
          minLength={8}
        />
        <WoodField
          label="Nhập lại mật khẩu mới"
          name="confirmPassword"
          icon={faLock}
          type="password"
          autoComplete="new-password"
          placeholder="Gõ lại lần nữa"
          minLength={8}
        />
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        <SubmitButton pending={pending} icon={faFloppyDisk}>
          Lưu và vào game
        </SubmitButton>
      </form>
    </div>
  );
}
