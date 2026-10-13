/**
 * Vai trò người dùng và bảng phân quyền trang quản trị.
 *
 * Bảng này quyết định MENU nào hiện cho ai và trang nào chặn ai (apps/admin).
 * Database có RLS kiểm tra lại vai trò lần nữa (xem supabase/migrations), nên sửa ở đây
 * mà quên sửa RLS thì người dùng thấy menu nhưng vẫn bị database từ chối.
 */

/** Khớp với enum public.user_role trong database. */
export const ROLES = ["player", "admin", "editor", "moderator"] as const;
export type Role = (typeof ROLES)[number];

/** Vai trò được vào trang quản trị (bắt buộc xác thực hai lớp). */
export const STAFF_ROLES = ["admin", "editor", "moderator"] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  player: "Người chơi",
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  moderator: "Điều hành viên",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: Role | null | undefined): role is StaffRole {
  return role != null && (STAFF_ROLES as readonly string[]).includes(role);
}

/** Nhóm trên thanh bên. Tổng quan không thuộc nhóm nào. */
export const ADMIN_SECTION_GROUPS = {
  content: "Nội dung học",
  economy: "Kinh tế",
  operations: "Vận hành",
} as const;
export type AdminSectionGroup = keyof typeof ADMIN_SECTION_GROUPS;

export interface AdminSection {
  key: string;
  href: string;
  label: string;
  group: AdminSectionGroup | null;
  roles: readonly StaffRole[];
}

/**
 * Bảng phân quyền: mỗi mục menu / trang của apps/admin và các vai trò được vào.
 * Thứ tự ở đây là thứ tự trên thanh bên. Route con dùng chung quyền của mục cha,
 * ví dụ /lands/[landId]/areas/... (khu vực, bài học) dùng quyền của "lands".
 */
export const ADMIN_SECTIONS = {
  overview: {
    key: "overview",
    href: "/",
    label: "Tổng quan",
    group: null,
    roles: ["admin", "editor", "moderator"],
  },
  lands: { key: "lands", href: "/lands", label: "Vùng đất", group: "content", roles: ["admin", "editor"] },
  words: { key: "words", href: "/words", label: "Kho từ vựng", group: "content", roles: ["admin", "editor"] },
  media: { key: "media", href: "/media", label: "Media", group: "content", roles: ["admin", "editor"] },
  economy: {
    key: "economy",
    href: "/economy",
    label: "Vật phẩm và kinh tế",
    group: "economy",
    roles: ["admin"],
  },
  players: {
    key: "players",
    href: "/players",
    label: "Người chơi và báo cáo",
    group: "operations",
    roles: ["admin", "moderator"],
  },
  logs: { key: "logs", href: "/logs", label: "Nhật ký", group: "operations", roles: ["admin"] },
} as const satisfies Record<string, AdminSection>;

export type AdminSectionKey = keyof typeof ADMIN_SECTIONS;

function sectionAllows(section: AdminSection, role: Role | null | undefined): boolean {
  return role != null && (section.roles as readonly Role[]).includes(role);
}

export function canAccessSection(role: Role | null | undefined, key: AdminSectionKey): boolean {
  return sectionAllows(ADMIN_SECTIONS[key], role);
}

/** Các mục menu mà vai trò này được thấy, theo đúng thứ tự trong bảng. */
export function sectionsForRole(role: Role | null | undefined): (typeof ADMIN_SECTIONS)[AdminSectionKey][] {
  return Object.values(ADMIN_SECTIONS).filter((section) => sectionAllows(section, role));
}
