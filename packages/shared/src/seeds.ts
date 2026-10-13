/**
 * Bảng giá hạt giống. Đây là nguồn dữ liệu gốc: supabase/seed.sql phải khớp với file này.
 */

export type SeedId = "carrot" | "tomato" | "corn";

export interface SeedDefinition {
  id: SeedId;
  /** Giá mua một hạt giống (vàng). */
  buyPrice: number;
  /** Giá bán một nông sản sau khi thu hoạch (vàng). */
  sellPrice: number;
  /** Thời gian cây lớn, tính bằng giây. */
  growSeconds: number;
  /** Từ vựng tiếng Anh gắn với cây này (id trong content/en/vegetables.json). */
  wordId: string;
  word: string;
  meaning: string;
}

export const SEEDS: Record<SeedId, SeedDefinition> = {
  carrot: {
    id: "carrot",
    buyPrice: 10,
    sellPrice: 18,
    growSeconds: 60,
    wordId: "en-carrot",
    word: "carrot",
    meaning: "cà rốt",
  },
  tomato: {
    id: "tomato",
    buyPrice: 15,
    sellPrice: 28,
    growSeconds: 120,
    wordId: "en-tomato",
    word: "tomato",
    meaning: "cà chua",
  },
  corn: {
    id: "corn",
    buyPrice: 20,
    sellPrice: 40,
    growSeconds: 180,
    wordId: "en-corn",
    word: "corn",
    meaning: "ngô",
  },
};

export const SEED_LIST: SeedDefinition[] = Object.values(SEEDS);

export function isSeedId(value: unknown): value is SeedId {
  return typeof value === "string" && value in SEEDS;
}
