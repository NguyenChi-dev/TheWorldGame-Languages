import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaffRole } from "@lw/shared";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/auth/form";
import { linkClass, secondaryButtonClass } from "@/components/auth/styles";
import { getSession, isSignInComplete, readMfaRequired } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

type LoginSearchParams = { denied?: string; confirmed?: string; confirm_error?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  const [session, params, mfaRequired] = await Promise.all([
    getSession(),
    searchParams,
    createClient().then(readMfaRequired),
  ]);

  if (session && isStaffRole(session.role)) {
    redirect(isSignInComplete(session) ? "/" : "/login/mfa");
  }

  // Đang đăng nhập bằng tài khoản chưa có quyền (ví dụ cookie từ game): chặn, cho đăng xuất.
  if (session) {
    return (
      <AuthCard title="Chưa có quyền truy cập" subtitle={session.email ?? undefined}>
        <form action={signOut} className="space-y-5">
          <Alert tone="error">
            Tài khoản này chưa được cấp quyền quản trị. Hãy nhờ admin cấp vai trò rồi đăng nhập lại.
          </Alert>
          <button type="submit" className={secondaryButtonClass}>
            Đăng xuất và dùng tài khoản khác
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để vào trang quản trị Language World."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href="/signup" className={linkClass}>
            Đăng ký
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {params.denied ? <Alert tone="error">Bạn không có quyền vào trang quản trị.</Alert> : null}
        {params.confirmed ? (
          <Alert tone="success">Đã xác nhận email. Hãy báo admin cấp quyền, sau đó đăng nhập.</Alert>
        ) : null}
        {params.confirm_error ? (
          <Alert tone="error">Link xác nhận không hợp lệ hoặc đã hết hạn.</Alert>
        ) : null}
        <LoginForm mfaRequired={mfaRequired} />
      </div>
    </AuthCard>
  );
}
