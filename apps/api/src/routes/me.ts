import { Hono } from "hono";
import { isRole, parseAppearance } from "@lw/shared";
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

const PROFILE_COLUMNS = "username, role, appearance, land_id";

function toMe(
  user: { id: string; email: string | null },
  row: { username?: unknown; role?: unknown; appearance?: unknown; land_id?: unknown } | null,
): MeResponse {
  return {
    id: user.id,
    email: user.email,
    username: typeof row?.username === "string" ? row.username : null,
    role: isRole(row?.role) ? row.role : "player",
    appearance: parseAppearance(row?.appearance),
    landId: typeof row?.land_id === "string" ? row.land_id : null,
  };
}

export const meRoutes = new Hono<AuthEnv>()
  .use(auth)

  /** GET /me: id, email (từ token) + tên nhân vật, vai trò, ngoại hình, vùng đất đang chọn (từ database). */
  .get("/", async (c) => {
    const user = c.get("user");
    const { data, error } = await supabaseOrFail()
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[me] Không đọc được profiles:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    return c.json(toMe(user, data));
  })

  /**
   * PATCH /me: đổi tên nhân vật, ngoại hình (màn chọn nhân vật) và / hoặc vùng đất (màn chọn vùng đất).
   * Chỉ đổi được cột username, appearance, land_id của CHÍNH mình (không bao giờ đổi role).
   * Vùng đất phải tồn tại và đang bật.
   */
  .patch("/", validate("json", UpdateMeRequest), async (c) => {
    const user = c.get("user");
    const { username, appearance, landId } = c.req.valid("json");
    const supabase = supabaseOrFail();
    const changes: { username?: string; appearance?: object; land_id?: string } = {};
    if (username !== undefined) changes.username = username;
    if (appearance !== undefined) changes.appearance = appearance;
    if (landId !== undefined) {
      // Khóa bí mật bỏ qua RLS: tự kiểm tra vùng đất đang bật.
      const { data: land, error: landError } = await supabase
        .from("lands")
        .select("id")
        .eq("id", landId)
        .eq("is_active", true)
        .maybeSingle();
      if (landError) {
        console.error("[me] Không đọc được lands:", landError.message);
        throw new ApiError(500, Messages.internal);
      }
      if (!land) throw new ApiError(404, "Vùng đất không tồn tại hoặc đang đóng");
      changes.land_id = landId;
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) {
      // Trùng tên (kể cả khác hoa thường, xem index profiles_username_lower_key).
      if (error.code === "23505") throw new ApiError(409, "Tên nhân vật này đã có người dùng");
      console.error("[me] Không đổi được hồ sơ:", error.message);
      throw new ApiError(500, Messages.internal);
    }
    if (!data) throw new ApiError(404, "Không tìm thấy hồ sơ người chơi");
    return c.json(toMe(user, data));
  });
