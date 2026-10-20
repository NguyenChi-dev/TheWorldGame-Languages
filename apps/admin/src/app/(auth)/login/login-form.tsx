"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, PasswordField, SubmitButton, TextField } from "@/components/auth/form";
import { useFormCheck } from "@/components/auth/use-form-check";
import { ArrowRightIcon, LockIcon, MailIcon } from "@/components/icons";
import type { ActionState } from "@/lib/action-state";
import { SIGN_IN_FIELDS, SignInInput } from "@/lib/auth-schemas";
import { signIn } from "../actions";

/** `mfaRequired`: công tắc 2 lớp đang bật thì nhắc trước là sẽ cần mã ở bước sau. */
export function LoginForm({ mfaRequired }: { mfaRequired: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, {});
  const check = useFormCheck(SignInInput, SIGN_IN_FIELDS, state.fieldErrors);
  // Trang muốn vào trước khi bị chuyển tới đăng nhập. Máy chủ tự kiểm tra lại (chống open redirect).
  const next = useSearchParams().get("next");

  return (
    <form
      action={formAction}
      onSubmit={check.onSubmit}
      noValidate
      className="stagger space-y-4 short:space-y-3"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label="Email"
        icon={MailIcon}
        name="email"
        type="email"
        autoComplete="username"
        placeholder="ban@vidu.com"
        defaultValue={state.values?.email}
        error={check.error("email")}
        onChange={() => check.clear("email")}
        required
        autoFocus
      />
      <PasswordField
        label="Mật khẩu"
        icon={LockIcon}
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={check.error("password")}
        onChange={() => check.clear("password")}
        required
      />
      {check.offlineError ? <Alert tone="error">{check.offlineError}</Alert> : null}
      {state.error && !check.offlineError ? <Alert tone="error">{state.error}</Alert> : null}
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
