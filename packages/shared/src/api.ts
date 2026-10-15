/**
 * Giao kèo giữa apps/api (máy chủ) và các app gọi vào nó (web, admin, app điện thoại).
 *
 * - Mỗi route có schema Zod cho dữ liệu GỬI LÊN (Request) và dữ liệu TRẢ VỀ (Response).
 * - apps/api dùng schema để kiểm tra dữ liệu thật lúc chạy.
 * - apps/web chỉ dùng KIỂU (import type), nên Zod không bị đóng gói vào trình duyệt.
 *
 * Nhập từ "@lw/shared/api" (không phải "@lw/shared") để các gói khác không phải kéo theo Zod.
 * Thêm route mới cho game thì khai báo schema ở đây khi bắt đầu làm phần đó.
 */
import { z } from "zod";
import { STAFF_ROLES } from "./roles";

// -----------------------------------------------------------------------------
// Dùng chung
// -----------------------------------------------------------------------------

/** Mọi lỗi từ apps/api đều có dạng này. */
export const ErrorResponse = z.object({ error: z.string() });
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// -----------------------------------------------------------------------------
// GET /health
// -----------------------------------------------------------------------------

export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("api"),
  /** Giờ máy chủ dạng ISO, ví dụ "2026-10-13T02:00:00.000Z". */
  time: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

// -----------------------------------------------------------------------------
// GET /me
// -----------------------------------------------------------------------------

export const MeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;

// -----------------------------------------------------------------------------
// Quản trị: GET /admin/me
// -----------------------------------------------------------------------------

export const AdminMeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: z.enum(STAFF_ROLES),
});
export type AdminMeResponse = z.infer<typeof AdminMeResponse>;
