/**
 * Middleware xác thực: chỉ cho đi tiếp khi có token đăng nhập Supabase hợp lệ.
 *
 * - Token đọc từ header "Authorization: Bearer <access_token>".
 * - Token được Supabase kiểm tra (chữ ký, hạn dùng). Không tin bất kỳ user id nào
 *   trình duyệt gửi trong nội dung yêu cầu: user id CHỈ lấy từ token đã kiểm tra.
 * - Route phía sau đọc người dùng bằng c.get("user").
 */
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import { ApiError, Messages } from "../lib/errors.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Kiểu "môi trường" của Hono cho các route cần đăng nhập. */
export type AuthEnv = {
  Variables: {
    user: AuthUser;
  };
};

function readBearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

export const auth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = readBearerToken(c.req.header("Authorization"));
  if (!token) throw new ApiError(401, Messages.unauthenticated);

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new ApiError(503, Messages.supabaseNotConfigured);

  const { data, error } = await supabase.auth.getClaims(token);
  if (error) {
    if (isAuthRetryableFetchError(error)) throw new ApiError(503, Messages.supabaseUnavailable);
    throw new ApiError(401, Messages.invalidSession);
  }

  // Khóa publishable/secret cũng là JWT hợp lệ nhưng không phải người dùng:
  // chỉ chấp nhận token của người đã đăng nhập (role "authenticated", có sub = user id).
  const claims = data?.claims;
  if (!claims?.sub || claims.role !== "authenticated") {
    throw new ApiError(401, Messages.invalidSession);
  }

  c.set("user", { id: claims.sub, email: claims.email || null });
  await next();
});
