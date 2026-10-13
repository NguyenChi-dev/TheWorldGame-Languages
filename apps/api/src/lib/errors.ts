/**
 * Mọi lỗi của apps/api đều trả về dạng { error: "<thông báo tiếng Việt>" }.
 * Trong code chỉ cần `throw new ApiError(...)`; app.onError (src/app.ts) sẽ biến nó thành JSON.
 */
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorResponse } from "@lw/shared/api";

/** Các thông báo dùng nhiều lần, để giữ cách nói thống nhất. */
export const Messages = {
  unauthenticated: "Chưa đăng nhập",
  invalidSession: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
  forbiddenAdmin: "Bạn không có quyền truy cập trang quản trị",
  mfaRequired: "Cần xác thực hai lớp (TOTP) trước khi dùng chức năng quản trị",
  supabaseNotConfigured: "Chưa cấu hình Supabase",
  supabaseUnavailable: "Không kết nối được tới Supabase, vui lòng thử lại sau",
  invalidInput: "Dữ liệu gửi lên không hợp lệ",
  notImplemented: "Chưa làm",
  notFound: "Không tìm thấy đường dẫn này",
  tooLarge: "Dữ liệu gửi lên quá lớn",
  internal: "Máy chủ gặp lỗi, vui lòng thử lại sau",
} as const;

/** Lỗi có thông báo AN TOÀN để gửi cho người dùng. */
export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string) {
    super(status, { message });
  }
}

export function errorJson(c: Context, status: ContentfulStatusCode, error: string) {
  return c.json({ error } satisfies ErrorResponse, status);
}

/** Dùng cho route mới có khung, chưa làm logic thật. */
export function notImplemented(c: Context) {
  return errorJson(c, 501, Messages.notImplemented);
}

/** Thông báo chung cho lỗi Hono tự ném (ví dụ JSON hỏng), không để lộ chữ tiếng Anh nội bộ. */
export function messageForStatus(status: number): string {
  if (status === 400) return Messages.invalidInput;
  if (status === 401) return Messages.unauthenticated;
  if (status === 403) return "Bạn không có quyền làm việc này";
  if (status === 404) return Messages.notFound;
  if (status === 413) return Messages.tooLarge;
  return Messages.internal;
}
