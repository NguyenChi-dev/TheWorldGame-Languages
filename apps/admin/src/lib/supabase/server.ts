// Client Supabase dùng ở máy chủ: Server Component, Route Handler, Server Action.
// Dùng khóa publishable + cookie đăng nhập của người dùng, nên mọi truy vấn đều chịu RLS.
// Trang admin KHÔNG dùng khóa bí mật (service_role): quyền đến từ vai trò + RLS.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Luôn tạo client mới trong từng hàm/lần xử lý request, không lưu vào biến toàn cục.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll bị gọi từ Server Component (không được ghi cookie ở đó).
            // Bỏ qua được vì src/proxy.ts đã làm mới phiên đăng nhập trước mỗi request.
          }
        },
      },
    },
  );
}
