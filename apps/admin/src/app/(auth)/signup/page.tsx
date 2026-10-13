import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaffRole } from "@lw/shared";
import { AuthCard } from "@/components/auth/auth-card";
import { linkClass } from "@/components/auth/styles";
import { getSession, isSignInComplete } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function SignupPage() {
  const session = await getSession();
  if (session && isStaffRole(session.role)) redirect(isSignInComplete(session) ? "/" : "/login/mfa");

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle="Tài khoản mới cần admin cấp vai trò trước khi vào trang quản trị."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href="/login" className={linkClass}>
            Đăng nhập
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
