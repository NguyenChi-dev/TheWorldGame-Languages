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

  const method = options.method ?? "GET";
  const send = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  let response: Response;
  try {
    response = await send();
  } catch {
    // Chỉ thử lại yêu cầu ĐỌC (GET) một lần sau lỗi mạng thoáng qua. Thao tác ghi không tự gửi lại để
    // tránh làm 2 lần (ví dụ khóa / xóa tài khoản): người dùng tự bấm lại khi thấy lỗi.
    if (method !== "GET") {
      throw new ApiCallError(503, `Không kết nối được máy chủ API (${API_URL}). Thử lại sau giây lát.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      response = await send();
    } catch {
      throw new ApiCallError(503, `Không kết nối được máy chủ API (${API_URL}). Hãy chạy apps/api.`);
    }
  }
  // 502/503/504 với yêu cầu đọc: máy chủ đang khởi động lại / quá tải — thử lại một lần.
  if (method === "GET" && [502, 503, 504].includes(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    response = await send().catch(() => response);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as Partial<ErrorResponse> | null)?.error ?? `Máy chủ API lỗi (${response.status})`;
    throw new ApiCallError(response.status, message);
  }
  return data as T;
}
