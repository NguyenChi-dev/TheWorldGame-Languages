/**
 * Cookie đăng nhập RIÊNG của trang quản trị. apps/web (game) dùng tên khác ("lw-game-auth").
 *
 * Trình duyệt không tách cookie theo cổng: game (localhost:3000) và admin (localhost:3001) cùng thấy
 * cookie của nhau. Nếu cả hai dùng tên mặc định của Supabase ("sb-<project>-auth-token"), đăng nhập ở
 * game thì admin cũng bị đăng nhập theo (và ngược lại). Đặt tên riêng để hai phiên tách hẳn nhau.
 */
export const AUTH_COOKIE_OPTIONS = { name: "lw-admin-auth" };

/** Cookie tên mặc định cũ (dùng chung giữa 2 app trước đây): xóa đi khi gặp. */
export const LEGACY_AUTH_COOKIE = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;
