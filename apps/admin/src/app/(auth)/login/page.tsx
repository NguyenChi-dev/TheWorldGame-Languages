import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaffRole } from "@lw/shared";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/auth/form";
import { SignedOutBroadcast } from "@/components/auth/session-watch";
import { linkClass, secondaryButtonClass } from "@/components/auth/styles";
import { getSession, isSignInComplete, readMfaRequired } from "@/lib/auth";
import { safeNextPath, withNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

type LoginSearchParams = {
  denied?: string;
  confirmed?: string;
  confirm_error?: string;
  /** Proxy gắn khi cookie phiên còn nhưng phiên đã hết hạn / bị thu hồi. */
  expired?: string;
  /** "1": đã đăng xuất; "partial": đã xóa phiên trên trình duyệt nhưng chưa báo được máy chủ. */
  signed_out?: string;
  next?: string;
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  const [session, params, mfaRequired] = await Promise.all([
    getSession(),
    searchParams,
    createClient().then(readMfaRequired),
  ]);

  const next = safeNextPath(params.next);
  if (session && isStaffRole(session.role)) {
    redirect(isSignInComplete(session) ? next : withNext("/login/mfa", next));
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
        {params.expired ? (
          <Alert tone="info">Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.</Alert>
        ) : null}
        {params.signed_out ? <SignedOutBroadcast /> : null}
        {params.signed_out === "1" ? <Alert tone="success">Đã đăng xuất.</Alert> : null}
        {params.signed_out === "partial" ? (
          <Alert tone="info">
            Đã đăng xuất trên trình duyệt này, nhưng chưa báo được máy chủ (mất kết nối). Phiên cũ sẽ tự hết
            hạn.
          </Alert>
        ) : null}
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
