/**
 * Ngoại hình nhân vật người chơi tự phối ở màn chọn nhân vật (lưu ở profiles.appearance, dạng JSON).
 *
 *   gender  nam / nữ: kiểu tóc, dáng người.
 *   hat     mũ / nón / phụ kiện tóc.
 *   top     áo.
 *   bottom  váy / quần.
 *
 * Mỗi món lấy từ trang phục một vùng đất và mặc lẫn được với nhau (nam mặc váy kimono, nữ đội mũ lông
 * gấu... đều được). Hình 3D dựng bằng khối low-poly trong packages/game/src/scene/character.ts.
 *
 * Thêm món mới: thêm vào HATS / TOPS / BOTTOMS (và cách vẽ trong character.ts). Database chỉ kiểm tra
 * cấu trúc JSON, không cần migration; apps/api kiểm tra mã món bằng danh sách ở đây.
 */

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { female: "Nữ", male: "Nam" };

export interface OutfitPart {
  name: string;
  /** Vùng đất của món đồ (bỏ trống với "Không đội"). */
  origin?: string;
  /** Màu chính, dạng #rrggbb. */
  color: string;
  /** Màu phụ: viền, thắt lưng, phụ kiện. */
  accent: string;
}

// -----------------------------------------------------------------------------
// Mũ / nón
// -----------------------------------------------------------------------------

export const HAT_KEYS = ["none", "conical", "kanzashi", "bearskin", "crown", "ribbon", "beret"] as const;
export type HatKey = (typeof HAT_KEYS)[number];

export const HATS: Record<HatKey, OutfitPart> = {
  none: { name: "Không đội", color: "#e7d5b8", accent: "#b49b77" },
  conical: { name: "Nón lá", origin: "Việt Nam", color: "#e9d08f", accent: "#c9a253" },
  kanzashi: { name: "Trâm hoa", origin: "Nhật Bản", color: "#c8314b", accent: "#f7c6d3" },
  bearskin: { name: "Mũ lông gấu", origin: "Anh", color: "#141414", accent: "#f2c94c" },
  crown: { name: "Mũ miện", origin: "Trung Quốc", color: "#f0b93a", accent: "#c9283a" },
  ribbon: { name: "Nơ tóc", origin: "Hàn Quốc", color: "#d8344f", accent: "#f6b3c4" },
  beret: { name: "Mũ nồi", origin: "Pháp", color: "#26365e", accent: "#3d5288" },
};

// -----------------------------------------------------------------------------
// Áo
// -----------------------------------------------------------------------------

export const TOP_KEYS = ["aodai", "kimono", "guard", "hanfu", "hanbok", "breton"] as const;
export type TopKey = (typeof TOP_KEYS)[number];

export interface TopPart extends OutfitPart {
  /** Tay áo rộng (kimono, hán phục). */
  wideSleeves?: boolean;
  /** Đai to ngang eo (obi). */
  wideBelt?: boolean;
  /** Hai vạt áo dài trước / sau buông tới gối (áo dài). */
  panels?: boolean;
  /** Hàng cúc trước ngực. */
  buttons?: boolean;
  /** Nơ thắt trước ngực (hanbok). */
  bow?: boolean;
  /** Khăn quàng cổ (màu accent). */
  scarf?: boolean;
  /** Màu sọc ngang trên thân áo. */
  stripes?: string;
}

export const TOPS: Record<TopKey, TopPart> = {
  aodai: { name: "Áo dài", origin: "Việt Nam", color: "#f7f3ea", accent: "#d9b56b", panels: true },
  kimono: {
    name: "Kimono",
    origin: "Nhật Bản",
    color: "#f4a7bd",
    accent: "#c8314b",
    wideSleeves: true,
    wideBelt: true,
  },
  guard: { name: "Áo cận vệ", origin: "Anh", color: "#c62b2b", accent: "#f2c94c", buttons: true },
  hanfu: {
    name: "Hán phục",
    origin: "Trung Quốc",
    color: "#c9283a",
    accent: "#f0b93a",
    wideSleeves: true,
    wideBelt: true,
  },
  hanbok: { name: "Áo hanbok", origin: "Hàn Quốc", color: "#f6b3c4", accent: "#d8344f", bow: true },
  breton: {
    name: "Áo sọc",
    origin: "Pháp",
    color: "#f4f1e8",
    accent: "#d63c3c",
    scarf: true,
    stripes: "#2f4a7a",
  },
};

// -----------------------------------------------------------------------------
// Váy / quần
// -----------------------------------------------------------------------------

export const BOTTOM_KEYS = ["silk", "kimono", "guard", "hanfu", "chima", "navy"] as const;
export type BottomKey = (typeof BOTTOM_KEYS)[number];

export interface BottomPart extends OutfitPart {
  /** dress: váy dài xòe; pants: quần + giày. */
  style: "dress" | "pants";
}

export const BOTTOMS: Record<BottomKey, BottomPart> = {
  silk: { name: "Quần lụa", origin: "Việt Nam", color: "#f7f3ea", accent: "#e7dcc6", style: "pants" },
  kimono: { name: "Váy kimono", origin: "Nhật Bản", color: "#f4a7bd", accent: "#c8314b", style: "dress" },
  guard: { name: "Quần cận vệ", origin: "Anh", color: "#1e2433", accent: "#c62b2b", style: "pants" },
  hanfu: { name: "Váy hán phục", origin: "Trung Quốc", color: "#8c1626", accent: "#f0b93a", style: "dress" },
  chima: { name: "Váy chima", origin: "Hàn Quốc", color: "#4a78c9", accent: "#d8344f", style: "dress" },
  navy: { name: "Quần âu", origin: "Pháp", color: "#2f4a7a", accent: "#22365c", style: "pants" },
};

// -----------------------------------------------------------------------------
// Ngoại hình
// -----------------------------------------------------------------------------

export interface CharacterAppearance {
  gender: Gender;
  hat: HatKey;
  top: TopKey;
  bottom: BottomKey;
}

/** Màu da, tóc (chưa cho chọn). */
export const SKIN_COLOR = "#f3c9a1";
export const HAIR_COLOR = "#2a1b12";

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  gender: "female",
  hat: "conical",
  top: "aodai",
  bottom: "silk",
};

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/**
 * Đọc ngoại hình từ database / form. Trả về null nếu không phải ngoại hình hợp lệ
 * (chưa chọn nhân vật, hoặc dữ liệu hỏng).
 */
export function parseAppearance(value: unknown): CharacterAppearance | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    !isOneOf(GENDERS, v.gender) ||
    !isOneOf(HAT_KEYS, v.hat) ||
    !isOneOf(TOP_KEYS, v.top) ||
    !isOneOf(BOTTOM_KEYS, v.bottom)
  )
    return null;
  return { gender: v.gender, hat: v.hat, top: v.top, bottom: v.bottom };
}

/** Phối ngẫu nhiên (nút "Ngẫu nhiên" ở màn chọn nhân vật). Giữ nguyên giới tính. */
export function randomAppearance(gender: Gender, random = Math.random): CharacterAppearance {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  return { gender, hat: pick(HAT_KEYS), top: pick(TOP_KEYS), bottom: pick(BOTTOM_KEYS) };
}
