"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, PasswordField, PasswordStrength, SubmitButton, TextField } from "@/components/auth/form";
import { ArrowRightIcon, LockIcon, MailIcon, UserIcon } from "@/components/icons";
import { secondaryButtonClass } from "@/components/auth/styles";
import type { ActionState } from "@/lib/action-state";
import { signUp } from "../actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUp, {});
  const [password, setPassword] = useState("");

  // Tạo xong thì thay form bằng hướng dẫn bước tiếp theo.
  if (state.message) {
    return (
      <div className="stagger space-y-5 text-center">
        {/* Biểu tượng thư "bật" ra, có vòng sóng lan tỏa phía sau. */}
        <div className="relative mx-auto size-20">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" />
          <span className="relative flex size-20 animate-pop items-center justify-center rounded-full bg-linear-to-br from-primary to-accent text-white shadow-lg shadow-accent/30">
            <MailIcon className="size-9" />
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{state.message}</p>
        <Link href="/login" className={secondaryButtonClass}>
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    // React tự xóa trắng form sau khi gửi: đặt lại thanh độ mạnh mật khẩu theo.
    <form action={formAction} onReset={() => setPassword("")} className="stagger space-y-4 short:space-y-3">
      <TextField
        label="Email"
        icon={MailIcon}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="ban@vidu.com"
        defaultValue={state.values?.email}
        required
        autoFocus
      />
      <TextField
        label="Tên hiển thị"
        icon={UserIcon}
        name="username"
        autoComplete="nickname"
        placeholder="vd: lan_bientap"
        defaultValue={state.values?.username}
        required
        minLength={3}
        maxLength={32}
        hint="3–32 ký tự: chữ, số, dấu _ . -"
      />
      {/* 2 ô mật khẩu nằm cạnh nhau để cả form vừa 1 khung, không phải cuộn. */}
      <div className="grid gap-4 sm:grid-cols-2 short:gap-3">
        <PasswordField
          label="Mật khẩu"
          icon={LockIcon}
          name="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={<PasswordStrength password={password} />}
        />
        <PasswordField
          label="Nhập lại mật khẩu"
          icon={LockIcon}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Nhập lại"
          required
          minLength={8}
        />
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending} pendingText="Đang tạo tài khoản..." icon={ArrowRightIcon}>
        Đăng ký
      </SubmitButton>
    </form>
  );
}
