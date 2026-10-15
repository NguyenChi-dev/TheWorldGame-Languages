/**
 * Địa chỉ apps/api khi gọi TỪ MÁY CHỦ Next.js (server action, route handler).
 * API_URL (chỉ máy chủ, ví dụ địa chỉ nội bộ) được ưu tiên, sau đó tới NEXT_PUBLIC_API_URL.
 */
export const SERVER_API_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");
