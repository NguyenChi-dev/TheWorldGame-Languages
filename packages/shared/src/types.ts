/**
 * Kiểu dữ liệu dùng chung cho web, admin, game và máy chủ realtime.
 * Tên trường dùng camelCase; khi đọc từ Supabase (snake_case) cần chuyển đổi.
 */
import type { Role } from "./roles";
import type { AreaScene, SkillColorKey, SkillIconKey } from "./world";

/** Mã ngôn ngữ 2–3 chữ thường của một vùng đất, ví dụ "en" (tiếng Anh), "ja" (tiếng Nhật). */
export type LanguageCode = string;

/** Tài khoản (bảng profiles). role: chỉ admin (đã qua 2 lớp) hoặc máy chủ được đổi. */
export interface Player {
  id: string;
  username: string | null;
  role: Role;
  createdAt: string;
}

/**
 * Vùng đất = một ngôn ngữ (bảng lands). Cấp lớn nhất của thế giới game.
 * KHÔNG có điều kiện mở khóa: vùng đang bật (isActive) thì người chơi vào được ngay.
 */
export interface Land {
  id: string;
  /** Định danh dễ đọc trong URL/code, chỉ a-z, 0-9 và dấu gạch ngang, ví dụ "tieng-anh". */
  slug: string;
  name: string;
  languageCode: LanguageCode;
  description: string;
  coverMediaId: string | null;
  /** Thứ tự hiển thị, nhỏ đứng trước. */
  sortOrder: number;
  isActive: boolean;
}

/** Kỹ năng luyện tập (bảng skills), dùng chung cho mọi vùng đất. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: SkillIconKey;
  color: SkillColorKey;
  /** Thứ tự hiển thị, nhỏ đứng trước. */
  sortOrder: number;
}

/** Khu vực = một địa điểm trong vùng đất, luyện MỘT kỹ năng (bảng areas). */
export interface Area {
  id: string;
  landId: string;
  name: string;
  scene: AreaScene;
  skillId: string;
  coverMediaId: string | null;
  /** Thứ tự trong vùng đất, nhỏ đứng trước. */
  unlockOrder: number;
  isActive: boolean;
}
