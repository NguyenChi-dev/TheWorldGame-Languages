/**
 * Trang muốn quay lại sau khi đăng nhập (?next=...). Chỉ nhận đường dẫn nội bộ của trang quản trị để
 * chống "open redirect" (kẻ xấu gửi link đăng nhập thật nhưng ?next= trỏ sang trang lừa đảo).
 * Không hợp lệ thì về Tổng quan ("/").
 */
const BASE = "http://admin.invalid";
const AUTH_PAGES = /^\/(login|signup|auth)(\/|$)/;

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 512) return "/";
  // Chỉ đường dẫn tuyệt đối trong site: "/x". Chặn "//evil.com", "/\evil.com" và ký tự điều khiển.
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE || AUTH_PAGES.test(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** "/login/mfa?next=/players" — giữ trang đích qua các bước đăng nhập. */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}
