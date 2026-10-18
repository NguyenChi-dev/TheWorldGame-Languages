import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, LEGACY_AUTH_COOKIE } from "@/lib/supabase/cookie";

/** Xóa cookie đăng nhập tên mặc định cũ (trước đây game và admin dùng chung, xem lib/supabase/cookie.ts). */
function dropLegacyAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll())
    if (LEGACY_AUTH_COOKIE.test(cookie.name)) response.cookies.delete(cookie.name);
  return response;
}

/**
 * Proxy chạy TRƯỚC mọi trang admin. (Từ Next.js 16, file "middleware.ts" đã đổi tên thành
 * "proxy.ts" và hàm "middleware" đổi thành "proxy"; chức năng giữ nguyên.)
 *
 * Việc của proxy:
 *   1. Làm mới phiên đăng nhập Supabase (ghi lại cookie khi token sắp hết hạn).
 *   2. Chưa đăng nhập thì chuyển về /login (kiểm tra "lạc quan", chỉ để chuyển hướng nhanh).
 *
 * Proxy KHÔNG phải lớp bảo mật chính: vai trò và xác thực hai lớp được kiểm tra trong
 * src/lib/auth.ts (mọi trang, mọi server action) và trong RLS của database.
 */
/** Trang mở được khi chưa đăng nhập: đăng nhập, đăng ký, link xác nhận email. */
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Chưa cấu hình Supabase: để trang tự báo lỗi, không chặn ở đây.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Không chèn code nào giữa createServerClient và getClaims (theo hướng dẫn của Supabase).
  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));

  if (!data?.claims && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return dropLegacyAuthCookies(request, redirect);
  }

  return dropLegacyAuthCookies(request, response);
}

export const config = {
  matcher: [
    // Chạy cho mọi đường dẫn, trừ file tĩnh của Next, ảnh tối ưu và favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
