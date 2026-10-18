// Client Supabase dùng trong Client Component (chạy trên trình duyệt).
// Theo hướng dẫn hiện hành của Supabase cho Next.js App Router. Chưa được gọi ở đâu.
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS } from "./cookie";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: AUTH_COOKIE_OPTIONS },
  );
}
