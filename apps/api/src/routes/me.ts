import { Hono } from "hono";
import { isRole } from "@lw/shared";
import { UpdateMeRequest, type MeResponse } from "@lw/shared/api";
import { ApiError, Messages } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { validate } from "../lib/validate.js";
import { auth, type AuthEnv } from "../middleware/auth.js";

/**
 * Hồ sơ của người đang đăng nhập (bảng profiles).
 * Khóa bí mật bỏ qua RLS, nên mọi truy vấn PHẢI lọc theo id lấy từ token (c.get("user").id),
 * không bao giờ theo id gửi trong nội dung yêu cầu.
 */
function supabaseOrFail() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);
  return supabase;
}

function toMe(
  user: { id: string; email: string | null },
  row: { username?: unknown; role?: unknown } | null,
): MeResponse {
  return {
    id: user.id,
    email: user.email,
    username: typeof row?.username === "string" ? row.username : null,
    role: isRole(row?.role) ? row.role : "player",
  };
}

export const meRoutes = new Hono<AuthEnv>()
  .use(auth)

  /** GET /me: id, email (từ token) + tên nhân vật, vai trò (từ database). */
  .get("/", async (c) => {
    const user = c.get("user");
    const { data, error } = await supabaseOrFail()
      .from("profiles")
      .select("username, role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[me] Không đọc được profiles:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    return c.json(toMe(user, data));
  })

  /** PATCH /me: đổi tên nhân vật. Chỉ đổi được cột username của CHÍNH mình (không bao giờ đổi role). */
  .patch("/", validate("json", UpdateMeRequest), async (c) => {
    const user = c.get("user");
    const { username } = c.req.valid("json");
    const { data, error } = await supabaseOrFail()
      .from("profiles")
      .update({ username })
      .eq("id", user.id)
      .select("username, role")
      .maybeSingle();
    if (error) {
      // Trùng tên (kể cả khác hoa thường, xem index profiles_username_lower_key).
      if (error.code === "23505") throw new ApiError(409, "Tên nhân vật này đã có người dùng");
      console.error("[me] Không đổi được username:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    if (!data) throw new ApiError(404, "Không tìm thấy hồ sơ người chơi");
    return c.json(toMe(user, data));
  });
