import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Link trong email xác nhận đăng ký trỏ về đây.
 * Hỗ trợ cả 2 dạng link của Supabase: ?code=... (mặc định) và ?token_hash=...&type=... (mẫu email tự sửa).
 * Xác nhận xong thì giữ phiên đăng nhập và vào thẳng game; lỗi thì quay về trang đăng nhập.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = request.nextUrl.clone();
  target.search = "";
  if (ok) {
    target.pathname = "/play";
  } else {
    target.pathname = "/login";
    target.search = "?confirm_error=1";
  }
  return NextResponse.redirect(target);
}
