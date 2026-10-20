import type { Metadata } from "next";
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
  // Đã qua 2 lớp, hoặc công tắc 2 lớp đang tắt: không cần trang này.
  if (isSignInComplete(session)) redirect(next);

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
        <form action={signOut}>
          <button
            type="submit"
            className="font-semibold text-accent underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Đăng xuất
          </button>
        </form>
      }
    >
      {hasTotp ? <TotpChallengeForm /> : <TotpEnrollForm />}
    </AuthCard>
  );
}
