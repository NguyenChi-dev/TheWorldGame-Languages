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

/**
 * Một tab (mục con) trong trang của mục chính, đổi bằng ?tab=<key>.
 * `ready`: đã có chức năng; chưa có thì trang hiện khung "Sắp có".
 */
export interface AdminSectionTab {
  key: string;
  label: string;
  ready?: boolean;
}

export interface AdminSection {
  key: string;
  href: string;
  label: string;
  /** Mô tả một dòng dưới tên mục (PageHeader). */
  description: string;
  group: AdminSectionGroup | null;
  roles: readonly StaffRole[];
  /** Tab trong trang (Tổng quan: các ô số liệu). Rỗng = trang không chia tab. */
  tabs: readonly AdminSectionTab[];
  children?: readonly AdminSubSection[];
}

/**
 * Cấu hình menu duy nhất của apps/admin: tên, đường dẫn, mô tả, tab và vai trò được vào của từng mục.
 * Thanh bên, tiêu đề trang và thanh tab đều đọc từ đây (icon ở apps/admin/src/components/section-meta.ts).
 * Thêm / đổi tên mục hoặc tab chỉ cần sửa bảng này.
 *
 * Vai trò của mỗi mục lấy từ ma trận thao tác PERMISSIONS (permissions.ts), không ghi tay lần hai.
 * Thứ tự ở đây là thứ tự trên thanh bên. Route con dùng chung quyền của mục cha,
 * ví dụ /lands/[landId]/areas/... (khu vực) dùng quyền của "lands".
 */
export const ADMIN_SECTIONS = {
  overview: {
    key: "overview",
    href: "/",
    label: "Tổng quan",
    description: "Bức tranh chung của trò chơi.",
    group: null,
    roles: PERMISSIONS["admin.access"],
    tabs: [
      { key: "players", label: "Người chơi mới và đang hoạt động" },
      { key: "lessons", label: "Bài học hoàn thành" },
      { key: "wrong-words", label: "Từ hay sai nhiều" },
      { key: "gold", label: "Vàng đang lưu hành" },
    ],
  },
  lands: {
    key: "lands",
    href: "/lands",
    label: "Vùng đất và khu vực",
    description: "Mỗi vùng đất là một ngôn ngữ, gồm các khu vực luyện từng kỹ năng.",
    group: "content",
    roles: PERMISSIONS["content.update"],
    tabs: [
      { key: "lands", label: "Vùng đất (ngôn ngữ)", ready: true },
      { key: "skills", label: "Khu vực (kỹ năng)", ready: true },
      { key: "unlock", label: "Bật/tắt và thứ tự mở khóa", ready: true },
    ],
    children: [
      { href: "/lands", label: "Danh sách vùng đất" },
      { href: "/map-editor", label: "Thiết kế bản đồ 3D" },
    ],
  },
  words: {
    key: "words",
    href: "/words",
    label: "Kho từ vựng",
    description: "Kho từ vựng đầy đủ của mỗi vùng đất, nhập từ CSV.",
    group: "content",
    roles: PERMISSIONS["content.update"],
    tabs: [
      { key: "list", label: "Danh sách và bộ lọc" },
      { key: "import", label: "Nhập CSV" },
      { key: "errors", label: "Lỗi khi nhập" },
    ],
  },
  lessons: {
    key: "lessons",
    href: "/lessons",
    label: "Bài học",
    description: "Bài học và câu hỏi của từng khu vực.",
    group: "content",
    roles: PERMISSIONS["content.update"],
    tabs: [
      { key: "list", label: "Danh sách bài học" },
      { key: "questions", label: "Câu hỏi theo kỹ năng" },
      { key: "publish", label: "Nháp và xuất bản" },
    ],
  },
  media: {
    key: "media",
    href: "/media",
    label: "Media",
    description: "Mô hình 3D, hình ảnh và âm thanh dùng trong game.",
    group: "content",
    roles: PERMISSIONS["media.create"],
    tabs: [
      { key: "models", label: "Mô hình 3D" },
      { key: "images", label: "Hình ảnh", ready: true },
      { key: "audio", label: "Âm thanh" },
    ],
  },
  economy: {
    key: "economy",
    href: "/economy",
    label: "Vật phẩm và kinh tế",
    description: "Vật phẩm, giá mua bán và phần thưởng.",
    group: "economy",
    roles: PERMISSIONS["economy.manage"],
    tabs: [
      { key: "prices", label: "Giá mua/bán" },
      { key: "growth", label: "Thời gian cây lớn" },
      { key: "rewards", label: "Phần thưởng" },
      { key: "history", label: "Lịch sử thay đổi và hoàn tác" },
    ],
  },
  players: {
    key: "players",
    href: "/players",
    label: "Người chơi và báo cáo",
    description: "Tài khoản, tiến độ và báo cáo vi phạm.",
    group: "operations",
    roles: PERMISSIONS["players.read"],
    tabs: [
      { key: "progress", label: "Tiến độ người chơi" },
      { key: "reports", label: "Báo cáo và khóa chat" },
      { key: "accounts", label: "Khóa tài khoản", ready: true },
      { key: "gold", label: "Tặng vàng" },
    ],
  },
  logs: {
    key: "logs",
    href: "/logs",
    label: "Nhật ký",
    description: "Ai đã làm gì, lúc nào, vì sao.",
    group: "operations",
    roles: PERMISSIONS["logs.read"],
    tabs: [{ key: "all", label: "Toàn bộ thao tác" }],
  },
  settings: {
    key: "settings",
    href: "/settings",
    label: "Cài đặt bảo mật",
    description: "Áp dụng cho mọi nhân viên (admin, biên tập viên, điều hành viên).",
    group: "operations",
    roles: PERMISSIONS["settings.manage"],
    tabs: [],
  },
} as const satisfies Record<string, AdminSection>;

/**
 * Tab đang mở theo ?tab=. Sai / thiếu thì về tab có chức năng đầu tiên (giữ trang đang dùng được làm
 * mặc định), không có thì tab đầu tiên.
 */
export function activeSectionTab(
  section: AdminSection,
  tab: string | string[] | undefined,
): AdminSectionTab | null {
  const wanted = Array.isArray(tab) ? tab[0] : tab;
  return (
    section.tabs.find((item) => item.key === wanted) ??
    section.tabs.find((item) => item.ready) ??
    section.tabs[0] ??
    null
  );
}

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
