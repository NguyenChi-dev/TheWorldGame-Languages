import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaffRole } from "@lw/shared";
import { AuthCard } from "@/components/auth/auth-card";
import { getSession, isSignInComplete } from "@/lib/auth";
import { safeNextPath, withNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";
import { TotpChallengeForm, TotpEnrollForm } from "./totp-forms";

export const metadata: Metadata = { title: "Xác thực hai lớp" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [session, { next: rawNext }] = await Promise.all([getSession(), searchParams]);
  const next = safeNextPath(rawNext);
  if (!session) redirect(withNext("/login", next));
  if (!isStaffRole(session.role)) redirect("/login?denied=1");
  // Đã qua 2 lớp: không cần trang này. Công tắc 2 lớp tắt vẫn vào được để thiết lập / xác thực bổ sung
  // (thao tác nhạy cảm luôn cần AAL2, xem AAL2_PERMISSIONS).
  if (session.aal === "aal2") redirect(next);
  const optional = isSignInComplete(session);

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = (factors?.totp.length ?? 0) > 0;

  return (
    <AuthCard
      title={hasTotp ? "Nhập mã xác thực" : "Thiết lập xác thực hai lớp"}
      subtitle={
        <>
          Đang đăng nhập: <span className="font-medium text-slate-700">{session.email}</span>
        </>
      }
      footer={
        <div className="flex items-center justify-center gap-4">
          {optional ? (
            <Link
              href={next}
              className="font-semibold text-slate-500 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Để sau
            </Link>
          ) : null}
          <form action={signOut}>
            <button
              type="submit"
              className="font-semibold text-accent underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      }
    >
      {optional ? (
        <p className="mb-4 rounded-xl border border-secondary bg-background px-4 py-3 text-sm leading-relaxed text-slate-600">
          Đổi vai trò, quản lý tài khoản người chơi và xóa nội dung luôn cần xác thực hai lớp.
        </p>
      ) : null}
      {hasTotp ? <TotpChallengeForm /> : <TotpEnrollForm />}
    </AuthCard>
  );
}
