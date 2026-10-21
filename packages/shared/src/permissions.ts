/**
 * Ma trận phân quyền theo THAO TÁC — nguồn chính sách duy nhất cho apps/admin (menu, nút, server action)
 * và apps/api (middleware). Database (RLS, supabase/migrations) áp dụng cùng chính sách; test
 * apps/admin/src/lib/permissions-rls.test.ts đối chiếu bảng này với policy trong migrations.
 *
 * Nguyên tắc:
 * - Liệt kê vai trò cho từng thao tác, KHÔNG kế thừa theo cấp bậc (admin không tự động có mọi quyền
 *   mới thêm; phải ghi rõ).
 * - Đọc ≠ sửa ≠ xóa: xóa (không hoàn tác được) tách riêng khỏi sửa.
 * - Quản lý người chơi ≠ quản lý nhân viên (đổi vai trò).
 * - 'player' không có quyền quản trị nào. Vai trò lạ / thiếu = không có quyền (mặc định từ chối).
 * - Mọi thao tác ở đây còn yêu cầu xác thực hai lớp khi công tắc admin_settings.require_mfa bật
 *   (requireRole ở admin/api, has_staff_role trong RLS).
 */
import type { Role, StaffRole } from "./roles";

export const PERMISSIONS = {
  /** Vào trang quản trị (Tổng quan). */
  "admin.access": ["admin", "editor", "moderator"],

  // Nội dung học + thế giới game: vùng đất, khu vực, kỹ năng, thiết kế bản đồ (World Studio).
  /** Đọc cả nội dung đang tắt (người chơi chỉ thấy nội dung đang bật). */
  "content.read": ["admin", "editor", "moderator"],
  "content.create": ["admin", "editor"],
  "content.update": ["admin", "editor"],
  /** Bật / tắt hiển thị cho người chơi (publish). */
  "content.publish": ["admin", "editor"],
  /** Xóa vĩnh viễn: chỉ admin. Editor tắt hiển thị thay vì xóa. */
  "content.delete": ["admin"],

  // Thư viện ảnh (Cloudinary).
  "media.create": ["admin", "editor"],
  "media.update": ["admin", "editor"],
  "media.delete": ["admin", "editor"],

  // Người chơi.
  /** Xem danh sách / chi tiết người chơi. */
  "players.read": ["admin", "moderator"],
  /** Xác nhận email, gửi đặt lại mật khẩu, đổi tên, khóa / mở khóa, xóa tài khoản người chơi. */
  "players.manage": ["admin"],

  // Nhân viên và hệ thống.
  /** Đổi vai trò (cấp / thu hồi quyền nhân viên), đặt lại xác thực hai lớp của nhân viên khác. */
  "staff.manage": ["admin"],
  "logs.read": ["admin"],
  /** Ghi nhật ký cho thao tác của chính mình (luôn kèm thao tác ghi). */
  "logs.write": ["admin", "editor", "moderator"],
  "economy.manage": ["admin"],
  /** Cài đặt bảo mật: công tắc bắt buộc xác thực hai lớp cho mọi nhân viên. */
  "settings.manage": ["admin"],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Thao tác nhạy cảm (không hoàn tác được hoặc đụng tới tài khoản người khác): LUÔN cần phiên đã qua
 * xác thực hai lớp (AAL2), kể cả khi công tắc admin_settings.require_mfa đang tắt ("xác thực bổ sung").
 * Admin web (requirePermission) và apps/api (requireRole với aal2) cùng áp dụng.
 */
export const AAL2_PERMISSIONS = [
  "staff.manage",
  "players.manage",
  "content.delete",
  "settings.manage",
] as const satisfies readonly Permission[];

export function requiresAal2(permission: Permission): boolean {
  return (AAL2_PERMISSIONS as readonly Permission[]).includes(permission);
}

/** Vai trò `role` có quyền `permission` không. Thiếu vai trò / vai trò lạ → false. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role != null && (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/** Danh sách vai trò có quyền `permission` (dùng cho requireRole ở admin / api). */
export function rolesFor(permission: Permission): readonly StaffRole[] {
  return PERMISSIONS[permission];
}
