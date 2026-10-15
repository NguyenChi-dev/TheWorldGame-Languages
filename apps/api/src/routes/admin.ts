import { Hono } from "hono";
import { STAFF_ROLES } from "@lw/shared";
import type { AdminMeResponse } from "@lw/shared/api";
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
  });
