"use client";

import { useActionState } from "react";
import { Alert, PasswordField, SubmitButton, TextField } from "@/components/auth/form";
import { ArrowRightIcon, LockIcon, MailIcon } from "@/components/icons";
import type { ActionState } from "@/lib/action-state";
import { signIn } from "../actions";

/** `mfaRequired`: công tắc 2 lớp đang bật thì nhắc trước là sẽ cần mã ở bước sau. */
export function LoginForm({ mfaRequired }: { mfaRequired: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={formAction} className="stagger space-y-4 short:space-y-3">
      <TextField
        label="Email"
        icon={MailIcon}
        name="email"
        type="email"
        autoComplete="username"
        placeholder="ban@vidu.com"
        defaultValue={state.values?.email}
        required
        autoFocus
      />
      <PasswordField
        label="Mật khẩu"
        icon={LockIcon}
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending} pendingText="Đang đăng nhập..." icon={ArrowRightIcon}>
        Đăng nhập
      </SubmitButton>
      {mfaRequired ? (
        <p className="text-center text-xs text-slate-500">
          Bước tiếp theo sẽ yêu cầu mã từ ứng dụng xác thực trên điện thoại.
        </p>
      ) : null}
    </form>
  );
}
