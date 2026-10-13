/**
 * Middleware chặn người không phải admin. PHẢI đặt sau middleware auth.
 *
 * Vai trò đọc từ cột profiles.role trong database (bằng khóa bí mật),
 * không bao giờ tin vai trò do trình duyệt gửi lên hay ghi trong user_metadata
 * (người dùng tự sửa được user_metadata).
 */
import { createMiddleware } from "hono/factory";
import { ApiError, Messages } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import type { AuthEnv } from "./auth.js";

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw new ApiError(401, Messages.unauthenticated);

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);

  const { data, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) {
    // Ghi chi tiết vào log máy chủ, người dùng chỉ nhận thông báo chung.
    console.error("[require-admin] Không đọc được profiles:", error.message);
    throw new ApiError(500, Messages.internal);
  }

  if (data?.role !== "admin") throw new ApiError(403, Messages.forbiddenAdmin);
  await next();
});
