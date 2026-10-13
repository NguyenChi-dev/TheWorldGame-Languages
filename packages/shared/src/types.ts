/**
 * Kiểu dữ liệu dùng chung cho web, admin, game và máy chủ realtime.
 * Tên trường dùng camelCase; khi đọc từ Supabase (snake_case) cần chuyển đổi.
 */
import type { Role } from "./roles";
import type { AreaScene, LessonStatus, Skill } from "./world";

/** Mã ngôn ngữ 2–3 chữ thường của một vùng đất, ví dụ "en" (tiếng Anh), "ja" (tiếng Nhật). */
export type LanguageCode = string;

/** Cấp độ từ vựng: 1 là dễ nhất. */
export type WordLevel = 1 | 2 | 3;

/** Tài khoản người chơi (bảng profiles). role: chỉ admin (đã qua 2 lớp) hoặc máy chủ được đổi. */
export interface Player {
  id: string;
  username: string;
  gold: number;
  role: Role;
  createdAt: string;
}

/** Ngoại hình nhân vật người chơi tạo ra (bảng characters). */
export interface Character {
  id: string;
  playerId: string;
  name: string;
  bodyColor: string;
  hairStyle: string;
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

/** Điều kiện mở khóa khu vực, dạng JSON tự do, ví dụ { "lessons_done": 3 }. */
export type UnlockRequirement = Record<string, unknown>;

/** Khu vực = một địa điểm trong vùng đất, luyện MỘT kỹ năng (bảng areas). */
export interface Area {
  id: string;
  landId: string;
  name: string;
  scene: AreaScene;
  skill: Skill;
  coverMediaId: string | null;
  /** Thứ tự mở khóa trong vùng đất, nhỏ mở trước. */
  unlockOrder: number;
  unlockRequirement: UnlockRequirement;
  isActive: boolean;
}

/** Bài học, nằm trong một khu vực (bảng lessons). Từ vựng dùng trong bài nằm ở bảng lesson_words. */
export interface Lesson {
  id: string;
  areaId: string;
  title: string;
  status: LessonStatus;
  position: number;
}

/** Một từ vựng (bảng words). */
export interface Word {
  id: string;
  landId: string;
  word: string;
  meaning: string;
  level: WordLevel;
  topic: string;
}

export type ItemKind = "seed" | "crop" | "tool";

/** Vật phẩm bán trong cửa hàng (bảng items). */
export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  buyPrice: number;
  sellPrice: number;
  wordId: string | null;
}

/** Một ô đất trong nông trại (bảng farm_plots). */
export interface Plot {
  id: string;
  playerId: string;
  landId: string;
  x: number;
  z: number;
  itemId: string | null;
  plantedAt: string | null;
}

/** Một dòng trong túi đồ (bảng inventory). */
export interface InventoryItem {
  playerId: string;
  itemId: string;
  quantity: number;
}
