import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Link trong email xác nhận đăng ký trỏ về đây.
 * Hỗ trợ cả 2 dạng link của Supabase: ?code=... (mặc định) và ?token_hash=...&type=... (mẫu email tự sửa).
 *
 * Xác nhận xong thì đăng xuất luôn: tài khoản mới là 'player', phải chờ admin cấp quyền mới vào được.
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
  if (ok) await supabase.auth.signOut({ scope: "local" });

  const target = request.nextUrl.clone();
  target.pathname = "/login";
  target.search = ok ? "?confirmed=1" : "?confirm_error=1";
  return NextResponse.redirect(target);
}
