import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, LEGACY_AUTH_COOKIE, isAuthCookie } from "@/lib/supabase/cookie";

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
  // Local design tool: no database needed during development. Production still requires staff + MFA.
  if (process.env.NODE_ENV === "development" && request.nextUrl.pathname === "/map-editor") {
    return NextResponse.next({ request });
  }
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

  // Server Action (POST có header Next-Action): KHÔNG chuyển hướng ở đây. Chuyển hướng giữa lúc gửi form
  // làm trình duyệt nhận trang HTML thay vì kết quả action (lỗi khó hiểu, mất dữ liệu đang nhập).
  // An toàn vì mọi server action tự gọi requireRole: hết phiên thì action trả lỗi "phiên hết hạn".
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!data?.claims && !isPublicPath(request.nextUrl.pathname) && !isServerAction) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Ghi nhớ trang đang muốn vào để quay lại sau khi đăng nhập (trang login kiểm tra lại bằng safeNextPath).
    const { pathname, search } = request.nextUrl;
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    // Còn cookie phiên mà không đọc được phiên: phiên đã hết hạn / bị thu hồi.
    if (request.cookies.getAll().some((cookie) => isAuthCookie(cookie.name)))
      loginUrl.searchParams.set("expired", "1");
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return dropLegacyAuthCookies(request, redirect);
  }

  return dropLegacyAuthCookies(request, response);
}

export const config = {
  matcher: [
    // Chạy cho mọi đường dẫn, trừ file tĩnh của Next, ảnh tối ưu và favicon.
    // Trừ cả /map-editor/models (route dev-only, production luôn trả 404): proxy chỉ đệm 10 MB thân yêu cầu,
    // file GLB lớn hơn sẽ bị cắt cụt nếu đi qua proxy.
    "/((?!_next/static|_next/image|favicon.ico|map-editor/models|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
