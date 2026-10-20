/**
 * Trang muốn quay lại sau khi đăng nhập (?next=...). Hàm DUY NHẤT để kiểm tra mọi đích chuyển hướng
 * lấy từ dữ liệu người dùng (proxy, trang đăng nhập, xác thực hai lớp, server action).
 *
 * Chống "open redirect" (link đăng nhập thật nhưng ?next= trỏ sang trang lừa đảo):
 *   1. Chỉ nhận đường dẫn tuyệt đối trong site ("/x"), chặn "//evil", "/\evil", ký tự điều khiển.
 *   2. Chuẩn hóa bằng URL rồi kiểm tra origin không đổi.
 *   3. Allowlist: chỉ các mục của trang quản trị (ADMIN_SECTIONS + menu con), không có trang đăng nhập
 *      (tránh vòng lặp chuyển hướng).
 * Không hợp lệ thì về Tổng quan ("/"). Quyền vào trang đích vẫn do requireSection kiểm tra ở máy chủ.
 */
import { ADMIN_SECTIONS } from "@lw/shared";

const BASE = "http://admin.invalid";

/** Gốc đường dẫn được phép: "/lands" cho phép "/lands", "/lands/abc"... */
const ALLOWED_ROOTS = [
  ...new Set(
    Object.values(ADMIN_SECTIONS).flatMap((section) => [
      section.href,
      ...("children" in section ? section.children.map((child) => child.href) : []),
    ]),
  ),
].filter((href) => href !== "/");

function isAllowedPath(pathname: string) {
  return (
    pathname === "/" || ALLOWED_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`))
  );
}

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 512) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE || !isAllowedPath(url.pathname)) return "/";
    // Đường dẫn bị mã hóa để lách ("/%2F%2Fevil.com") vẫn chỉ là một đường dẫn trong site.
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** "/login/mfa?next=/players" — giữ trang đích qua các bước đăng nhập. */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}
