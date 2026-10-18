// Client Supabase dùng ở máy chủ: Server Component, Route Handler, Server Action.
// Theo hướng dẫn hiện hành của Supabase cho Next.js App Router. Chưa được gọi ở đâu.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS } from "./cookie";

/**
 * Luôn tạo client mới trong từng hàm/lần xử lý request, không lưu vào biến toàn cục.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll bị gọi từ Server Component (không được ghi cookie ở đó).
            // Có thể bỏ qua nếu sau này có proxy.ts làm mới phiên đăng nhập.
          }
        },
      },
    },
  );
}
