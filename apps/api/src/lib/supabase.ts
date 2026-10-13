/**
 * Client Supabase phía máy chủ, dùng khóa bí mật (service role).
 *
 * Khóa này BỎ QUA mọi RLS, nên chỉ được dùng ở đây, trong apps/api.
 * Vì bỏ qua RLS, mọi truy vấn về dữ liệu người chơi PHẢI tự lọc theo user.id
 * lấy từ middleware auth (ví dụ .eq("user_id", user.id)).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env.js";

let adminClient: SupabaseClient | null | undefined;

/** Trả về client, hoặc null khi chưa cấu hình Supabase (route sẽ trả 503). */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Máy chủ không đăng nhập thay ai, không lưu phiên.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}
