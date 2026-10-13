/**
 * Kiểu dữ liệu dùng chung cho web, admin, game và máy chủ realtime.
 * Tên trường dùng camelCase; khi đọc từ Supabase (snake_case) cần chuyển đổi.
 */

/** Mã ngôn ngữ của một vùng đất, ví dụ "en" là tiếng Anh. */
export type LanguageCode = "en";

/** Cấp độ từ vựng: 1 là dễ nhất. */
export type WordLevel = 1 | 2 | 3;

/** Tài khoản người chơi (bảng profiles). */
export interface Player {
  id: string;
  username: string;
  gold: number;
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

/** Vùng đất theo ngôn ngữ (bảng lands). */
export interface Land {
  id: string;
  name: string;
  languageCode: LanguageCode;
  description: string;
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
