/**
 * Middleware chặn theo vai trò cho các route quản trị. PHẢI đặt sau middleware auth.
 *
 * - Vai trò đọc từ cột profiles.role trong database (bằng khóa bí mật), không bao giờ tin vai trò
 *   do trình duyệt gửi lên hay ghi trong user_metadata (người dùng tự sửa được user_metadata).
 * - Giống apps/admin và RLS: tài khoản 'player' không bao giờ qua được, và nhân viên phải dùng
 *   token đã qua xác thực hai lớp (claim aal = "aal2"), trừ khi công tắc admin_settings.require_mfa
 *   đang tắt. Không đọc được công tắc thì coi như BẬT (an toàn).
 * - Route phía sau đọc vai trò bằng c.get("role").
 */
import { createMiddleware } from "hono/factory";
import { isRole, isStaffRole, type Role, type StaffRole } from "@lw/shared";
import { ApiError, Messages } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import type { AuthEnv } from "./auth.js";

/** Kiểu "môi trường" của Hono cho route đã qua requireRole. */
export type StaffEnv = AuthEnv & { Variables: { role: StaffRole } };

export function requireRole(roles: readonly Role[]) {
  return createMiddleware<StaffEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw new ApiError(401, Messages.unauthenticated);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);

    const [{ data, error }, settings] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("admin_settings").select("require_mfa").maybeSingle(),
    ]);
    if (error) {
      // Ghi chi tiết vào log máy chủ, người dùng chỉ nhận thông báo chung.
      console.error("[require-role] Không đọc được profiles:", error.message);
      throw new ApiError(500, Messages.internal);
    }

    const role = isRole(data?.role) ? data.role : "player";
    if (!isStaffRole(role) || !roles.includes(role)) throw new ApiError(403, Messages.forbiddenAdmin);
    const mfaRequired = settings.error ? true : settings.data?.require_mfa !== false;
    if (mfaRequired && user.aal !== "aal2") throw new ApiError(403, Messages.mfaRequired);

    c.set("role", role);
    await next();
  });
}
