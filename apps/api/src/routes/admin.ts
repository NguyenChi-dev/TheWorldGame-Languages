import { Hono } from "hono";
import { STAFF_ROLES } from "@lw/shared";
import { AdminStatsQuery, type AdminMeResponse } from "@lw/shared/api";
import { notImplemented } from "../lib/errors.js";
import { validate } from "../lib/validate.js";
import { auth } from "../middleware/auth.js";
import { requireRole, type StaffEnv } from "../middleware/require-role.js";

/**
 * Các route cho trang quản trị: phải đăng nhập, là nhân viên (admin/editor/moderator trong profiles.role)
 * VÀ token đã qua xác thực hai lớp. Route chỉ dành cho một số vai trò thì thêm requireRole([...]) riêng.
 */
export const adminRoutes = new Hono<StaffEnv>()
  .use(auth, requireRole(STAFF_ROLES))

  /** Thông tin nhân viên đang đăng nhập, để app quản trị biết hiện menu nào. */
  .get("/me", (c) => {
    const user = c.get("user");
    return c.json({ id: user.id, email: user.email, role: c.get("role") } satisfies AdminMeResponse);
  })

  .get("/stats", validate("query", AdminStatsQuery), (c) => {
    c.req.valid("query"); // { days }, mặc định 7
    // TODO: thống kê
    //   1. Đếm tổng số người chơi (profiles), số người hoạt động trong `days` ngày gần nhất.
    //   2. Đếm số từ vựng (words) và vật phẩm (items).
    //   3. Trả về { players, activePlayers, words, items }.
    return notImplemented(c);
  });
