import { Hono } from "hono";
import { AdminStatsQuery } from "@lw/shared/api";
import { notImplemented } from "../lib/errors.js";
import { validate } from "../lib/validate.js";
import { auth, type AuthEnv } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

/** Các route cho trang quản trị: phải đăng nhập VÀ có vai trò admin trong profiles.role. */
export const adminRoutes = new Hono<AuthEnv>()
  .use(auth, requireAdmin)

  .get("/stats", validate("query", AdminStatsQuery), (c) => {
    c.req.valid("query"); // { days }, mặc định 7
    // TODO: thống kê
    //   1. Đếm tổng số người chơi (profiles), số người hoạt động trong `days` ngày gần nhất.
    //   2. Đếm số từ vựng (words) và vật phẩm (items).
    //   3. Trả về { players, activePlayers, words, items }.
    return notImplemented(c);
  });
