// Client Supabase dùng trong Client Component (chạy trên trình duyệt).
// Theo hướng dẫn hiện hành của Supabase cho Next.js App Router. Chưa được gọi ở đâu.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
