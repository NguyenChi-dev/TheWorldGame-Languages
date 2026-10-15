import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy chạy TRƯỚC mọi trang web (Next.js 16: middleware.ts đổi tên thành proxy.ts).
 *
 *   1. Làm mới phiên đăng nhập Supabase (ghi lại cookie khi token sắp hết hạn).
 *   2. Trang game (/play) chỉ mở khi đã đăng nhập; chưa đăng nhập thì chuyển về /login.
 *
 * Đây là lớp chuyển hướng nhanh. Trang /play vẫn tự kiểm tra lại phiên ở máy chủ (app/play/page.tsx).
 */
/** Trang chỉ dành cho người đã đăng nhập. Trang chủ, /login, /auth/callback mở tự do. */
const PROTECTED_PATHS = ["/play"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Chưa cấu hình Supabase: để trang tự xử lý, không chặn ở đây.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
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

  if (!data?.claims && isProtected(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Chạy cho mọi đường dẫn, trừ file tĩnh của Next, ảnh tối ưu, favicon và file ảnh.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
