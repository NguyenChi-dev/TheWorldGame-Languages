import { Hono } from "hono";
import { SEED_LIST } from "@lw/shared";
import type { CatalogSeedsResponse } from "@lw/shared/api";

/** Danh mục công khai, ai cũng xem được. */
export const catalogRoutes = new Hono().get("/seeds", (c) =>
  // Bảng giá lấy từ @lw/shared, cùng nguồn với supabase/seed.sql và trang admin.
  c.json({ seeds: SEED_LIST } satisfies CatalogSeedsResponse),
);
