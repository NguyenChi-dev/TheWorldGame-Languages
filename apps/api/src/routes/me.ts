import { Hono } from "hono";
import type { MeResponse } from "@lw/shared/api";
import { auth, type AuthEnv } from "../middleware/auth.js";

/** GET /me: thông tin người đang đăng nhập (lấy từ token đã kiểm tra). */
export const meRoutes = new Hono<AuthEnv>().use(auth).get("/", (c) => {
  const user = c.get("user");
  return c.json({ id: user.id, email: user.email } satisfies MeResponse);
});
