import type { Metadata } from "next";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { WoodBoard } from "@/components/auth/wood-board";
import { FaIcon } from "@/components/fa-icon";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Đặt mật khẩu mới · Language World" };

/**
 * /reset-password: mở từ link trong email "quên mật khẩu" (qua /auth/callback, đã có phiên tạm).
 * Không có phiên (link hết hạn, hoặc mở thẳng) thì báo và cho gửi lại email.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-4 pb-8 pt-14">
      <div aria-hidden="true" className="home-fade-up pointer-events-none fixed inset-0 bg-sky-950/30" />
      <div className="home-fade-up absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link href="/login" className="wood-chip font-poly text-sm">
          <FaIcon icon={faArrowLeft} />
          Đăng nhập
        </Link>
      </div>

      <div className="relative my-auto w-full max-w-md">
        <WoodBoard>
          {user ? (
            <ResetPasswordForm email={user.email ?? null} />
          ) : (
            <div className="space-y-4 text-center">
              <h1 className="wood-carve font-poly text-[1.65rem] leading-tight sm:text-4xl">
                Link đã hết hạn
              </h1>
              <p className="wood-label font-game text-sm font-semibold">
                Link đặt lại mật khẩu không còn dùng được. Hãy gửi lại email quên mật khẩu.
              </p>
              <Link href="/login?tab=forgot" className="wood-submit rounded-2xl py-3 font-poly text-lg">
                Gửi lại email
              </Link>
            </div>
          )}
        </WoodBoard>
      </div>
    </main>
  );
}
