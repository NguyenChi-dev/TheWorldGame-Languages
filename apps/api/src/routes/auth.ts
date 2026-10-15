import { Hono } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { SignUpRequest, type SignUpResponse } from "@lw/shared/api";
import { ApiError, Messages } from "../lib/errors.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { validate } from "../lib/validate.js";

/**
 * POST /auth/signup: tạo tài khoản người chơi ĐÃ XÁC NHẬN SẴN (không gửi email xác nhận).
 *
 * Vì sao cần: dịch vụ email có sẵn của Supabase chỉ gửi được rất ít email mỗi giờ, nên đăng ký kiểu
 * "bấm link trong email" hay bị lỗi "gửi email quá nhiều lần" và tài khoản không được tạo.
 * Khi đã cấu hình SMTP riêng, web có thể quay lại cách cũ (SIGNUP_REQUIRE_EMAIL_CONFIRM=true ở apps/web).
 *
 * An toàn:
 *   - Vai trò luôn là 'player' (trigger handle_new_user, metadata chỉ có username).
 *   - Tên nhân vật kiểm tra trùng trước khi tạo.
 *   - Giới hạn 10 lần / 10 phút cho mỗi IP và 200 lần / giờ cho cả máy chủ (chống tạo tài khoản rác).
 *     Trang web gọi từ máy chủ nên gửi kèm IP thật của người chơi trong X-Forwarded-For.
 */
const perIp = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });
const global = createRateLimiter({ limit: 200, windowMs: 60 * 60 * 1000 });

/** Cho test đặt lại bộ đếm. */
export function resetSignUpLimits() {
  perIp.reset();
  global.reset();
}

function clientIp(c: Parameters<typeof getConnInfo>[0]): string {
  const forwarded = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

export const authRoutes = new Hono().post("/signup", validate("json", SignUpRequest), async (c) => {
  if (!perIp.take(clientIp(c)) || !global.take("all")) {
    throw new ApiError(429, "Tạo tài khoản quá nhiều lần, thử lại sau ít phút");
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);

  const { email, password, username } = c.req.valid("json");

  const { data: available, error: checkError } = await supabase.rpc("username_available", {
    p_username: username,
  });
  if (checkError) {
    console.error("[signup] Không kiểm tra được tên nhân vật:", checkError.message);
    throw new ApiError(500, Messages.internal);
  }
  if (!available) throw new ApiError(409, "Tên nhân vật này đã có người dùng, hãy chọn tên khác");

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Chỉ username. Vai trò KHÔNG lấy từ đây (database luôn đặt 'player').
    user_metadata: { username },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists" || error?.code === "user_already_exists") {
      throw new ApiError(409, "Email này đã có tài khoản, hãy đăng nhập");
    }
    if (error?.code === "weak_password") throw new ApiError(400, "Mật khẩu quá yếu, hãy dùng mật khẩu khác");
    if (error?.code === "email_address_invalid") throw new ApiError(400, "Email không hợp lệ");
    console.error("[signup] Không tạo được tài khoản:", error?.code, error?.message);
    throw new ApiError(500, "Không tạo được tài khoản, thử lại sau");
  }

  return c.json({ id: data.user.id, email, username } satisfies SignUpResponse);
});
