import type { Metadata } from "next";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/auth-panel";
import { WoodBoard } from "@/components/auth/wood-board";
import { FaIcon } from "@/components/fa-icon";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Đăng nhập · Language World" };

type SearchParams = Promise<{ tab?: string; confirm_error?: string }>;

/**
 * /login: bảng gỗ low-poly treo giữa thế giới game, có 2 tab Đăng nhập / Tạo tài khoản.
 * Mở thẳng tab tạo tài khoản bằng /login?tab=signup. Đã đăng nhập thì vào game luôn.
 */
export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab, confirm_error: confirmError } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/play");

  return (
    <main className="relative z-10 flex h-full flex-col items-center overflow-y-auto px-4 pb-8 pt-14">
      {/* Phủ tối nhẹ để bảng gỗ nổi bật trên nền. */}
      <div aria-hidden="true" className="home-fade-up pointer-events-none fixed inset-0 bg-sky-950/30" />

      <div className="home-fade-up absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link href="/" className="wood-chip font-poly text-sm">
          <FaIcon icon={faArrowLeft} />
          Trang chủ
        </Link>
      </div>

      <div className="relative my-auto w-full max-w-md">
        <WoodBoard>
          <AuthPanel
            initialTab={tab === "signup" ? "signup" : "signin"}
            notice={confirmError ? "Link xác nhận không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại." : null}
          />
        </WoodBoard>
      </div>
    </main>
  );
}
