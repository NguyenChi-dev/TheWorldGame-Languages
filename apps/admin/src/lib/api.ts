/**
 * Gọi apps/api từ máy chủ của trang admin (Server Component / server action), kèm token đăng nhập
 * của nhân viên đang dùng. apps/api tự kiểm tra lại token + vai trò, và là nơi DUY NHẤT giữ khóa bí mật
 * Supabase (cần cho dữ liệu đăng nhập ở auth.users: email, xác nhận email, khóa tài khoản...).
 *
 * Địa chỉ: API_URL (chỉ máy chủ) hoặc NEXT_PUBLIC_API_URL, mặc định http://localhost:4000.
 */
import "server-only";
import type { ErrorResponse } from "@lw/shared/api";
import { createClient } from "@/lib/supabase/server";

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  "",
);

/** Lỗi từ apps/api, thông báo đã là tiếng Việt, hiện thẳng cho người dùng được. */
export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiCallError(401, "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiCallError(503, `Không kết nối được máy chủ API (${API_URL}). Hãy chạy apps/api.`);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as Partial<ErrorResponse> | null)?.error ?? `Máy chủ API lỗi (${response.status})`;
    throw new ApiCallError(response.status, message);
  }
  return data as T;
}
