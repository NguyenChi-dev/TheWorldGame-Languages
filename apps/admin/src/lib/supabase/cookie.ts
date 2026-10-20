/**
 * Cookie đăng nhập RIÊNG của trang quản trị. apps/web (game) dùng tên khác ("lw-game-auth").
 *
 * Trình duyệt không tách cookie theo cổng: game (localhost:3000) và admin (localhost:3001) cùng thấy
 * cookie của nhau. Nếu cả hai dùng tên mặc định của Supabase ("sb-<project>-auth-token"), đăng nhập ở
 * game thì admin cũng bị đăng nhập theo (và ngược lại). Đặt tên riêng để hai phiên tách hẳn nhau.
 */
export const AUTH_COOKIE_OPTIONS = {
  name: "lw-admin-auth",
  /**
   * Trang quản trị chỉ đọc phiên ở máy chủ (proxy, Server Component, Server Action), không có Supabase
   * client trên trình duyệt. Nên cookie đặt httpOnly: JavaScript trên trang (kể cả mã độc XSS) không đọc
   * được token. Mặc định của @supabase/ssr là httpOnly: false vì app khác cần đọc từ trình duyệt.
   */
  httpOnly: true,
  /** Production chạy HTTPS: chỉ gửi cookie qua HTTPS. Dev (http://localhost) thì không bắt buộc. */
  secure: process.env.NODE_ENV === "production",
  /** Không gửi cookie khi trang web khác gửi form tới admin (chống CSRF), vẫn giữ khi bấm link vào. */
  sameSite: "lax" as const,
  path: "/",
};

/** Có cookie phiên quản trị (kể cả cookie chia mảnh ".0", ".1") hay không. */
export const isAuthCookie = (name: string) =>
  name === AUTH_COOKIE_OPTIONS.name || name.startsWith(`${AUTH_COOKIE_OPTIONS.name}.`);

/** Cookie tên mặc định cũ (dùng chung giữa 2 app trước đây): xóa đi khi gặp. */
export const LEGACY_AUTH_COOKIE = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;
