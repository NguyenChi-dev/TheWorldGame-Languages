import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy chạy TRƯỚC mọi trang admin. (Từ Next.js 16, file "middleware.ts" đã đổi tên thành
 * "proxy.ts" và hàm "middleware" đổi thành "proxy"; chức năng giữ nguyên.)
 *
 * Đây là nơi SẼ kiểm tra đăng nhập và vai trò admin ở giai đoạn sau:
 *   1. Tạo Supabase server client từ cookie của request.
 *   2. Gọi supabase.auth.getClaims() để lấy người dùng đã xác thực.
 *   3. Nếu chưa đăng nhập hoặc không có vai trò admin: chuyển hướng tới trang đăng nhập.
 *
 * Hiện tại CHƯA chặn gì, mọi request đều đi tiếp.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Chạy cho mọi đường dẫn, trừ file tĩnh của Next, ảnh tối ưu và favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
