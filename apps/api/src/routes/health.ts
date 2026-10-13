import { Hono } from "hono";
import type { HealthResponse } from "@lw/shared/api";

/** GET /health: kiểm tra máy chủ còn sống. Không cần đăng nhập, không cần Supabase. */
export const healthRoutes = new Hono().get("/", (c) =>
  c.json({ ok: true, service: "api", time: new Date().toISOString() } satisfies HealthResponse),
);
