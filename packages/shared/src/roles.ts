/**
 * Vai trò người dùng và bảng phân quyền trang quản trị.
 *
 * Bảng này quyết định MENU nào hiện cho ai và trang nào chặn ai (apps/admin).
 * Database có RLS kiểm tra lại vai trò lần nữa (xem supabase/migrations), nên sửa ở đây
 * mà quên sửa RLS thì người dùng thấy menu nhưng vẫn bị database từ chối.
 */

import { PERMISSIONS } from "./permissions";

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

/** Mục con trên thanh bên, hiện ra khi đang ở trong mục cha. Dùng chung quyền của mục cha. */
export interface AdminSubSection {
  href: string;
  label: string;
}

export interface AdminSection {
  key: string;
  href: string;
  label: string;
  group: AdminSectionGroup | null;
  roles: readonly StaffRole[];
  children?: readonly AdminSubSection[];
}

/**
 * Bảng phân quyền: mỗi mục menu / trang của apps/admin và các vai trò được vào.
 * Vai trò của mỗi mục lấy từ ma trận thao tác PERMISSIONS (permissions.ts), không ghi tay lần hai.
 * Thứ tự ở đây là thứ tự trên thanh bên. Route con dùng chung quyền của mục cha,
 * ví dụ /lands/[landId]/areas/... (khu vực, bài học) dùng quyền của "lands".
 */
export const ADMIN_SECTIONS = {
  overview: {
    key: "overview",
    href: "/",
    label: "Tổng quan",
    group: null,
    roles: PERMISSIONS["admin.access"],
  },
  lands: {
    key: "lands",
    href: "/lands",
    label: "Vùng đất",
    group: "content",
    roles: PERMISSIONS["content.update"],
    children: [
      { href: "/lands", label: "Danh sách vùng đất" },
      { href: "/lands/skills", label: "Kỹ năng luyện tập" },
      { href: "/map-editor", label: "Thiết kế bản đồ 3D" },
    ],
  },
  words: {
    key: "words",
    href: "/words",
    label: "Kho từ vựng",
    group: "content",
    roles: PERMISSIONS["content.update"],
  },
  media: {
    key: "media",
    href: "/media",
    label: "Media",
    group: "content",
    roles: PERMISSIONS["media.create"],
  },
  economy: {
    key: "economy",
    href: "/economy",
    label: "Vật phẩm và kinh tế",
    group: "economy",
    roles: PERMISSIONS["economy.manage"],
  },
  players: {
    key: "players",
    href: "/players",
    label: "Người chơi và báo cáo",
    group: "operations",
    roles: PERMISSIONS["players.read"],
  },
  logs: {
    key: "logs",
    href: "/logs",
    label: "Nhật ký",
    group: "operations",
    roles: PERMISSIONS["logs.read"],
  },
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
