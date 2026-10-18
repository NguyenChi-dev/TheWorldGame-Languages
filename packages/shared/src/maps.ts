/**
 * Bản đồ 3D của từng vùng đất (dựng bằng code ở packages/game/src/maps/).
 *
 * Mỗi bản đồ là một thị trấn có các địa điểm cố định. Người chơi bấm vào địa điểm (hoặc chọn trong
 * danh sách) thì nhân vật đi theo đường phố tới cửa. Sau này mỗi địa điểm sẽ nối với một khu vực
 * (bảng areas) để vào luyện kỹ năng.
 */

/** Các địa điểm trong thị trấn. */
export const TOWN_PLACE_KEYS = [
  "square",
  "school",
  "library",
  "market",
  "cafe",
  "cinema",
  "post_office",
  "farm",
  "bus_station",
] as const;
export type TownPlaceKey = (typeof TOWN_PLACE_KEYS)[number];

export interface TownPlaceInfo {
  /** Tên tiếng Anh (hiện trên biển hiệu). */
  en: string;
  /** Tên tiếng Việt. */
  vi: string;
  /** Học gì ở đây. */
  hint: string;
}

export const TOWN_PLACES: Record<TownPlaceKey, TownPlaceInfo> = {
  square: { en: "Town Square", vi: "Quảng trường", hint: "Chào hỏi, làm quen, hỏi đường" },
  school: { en: "School", vi: "Trường học", hint: "Lớp học, đồ dùng học tập, môn học" },
  library: { en: "Library", vi: "Thư viện", hint: "Đọc truyện ngắn, mượn sách" },
  market: { en: "Market", vi: "Chợ", hint: "Rau củ, trái cây, hỏi giá, mua bán" },
  cafe: { en: "Cafe", vi: "Quán cà phê", hint: "Gọi đồ uống, trò chuyện" },
  cinema: { en: "Movie Theater", vi: "Rạp chiếu phim", hint: "Nghe hiểu, mua vé, thể loại phim" },
  post_office: { en: "Post Office", vi: "Bưu điện", hint: "Viết thư, gửi bưu kiện, địa chỉ" },
  farm: { en: "Farm", vi: "Nông trại", hint: "Con vật, cây trồng, công việc nhà nông" },
  bus_station: {
    en: "Bus Station / Repair Shop",
    vi: "Trạm xe buýt / Tiệm sửa xe",
    hint: "Phương tiện, lịch trình, chỉ đường",
  },
};

export const isTownPlaceKey = (value: unknown): value is TownPlaceKey =>
  typeof value === "string" && (TOWN_PLACE_KEYS as readonly string[]).includes(value);

/** Các bản đồ đã dựng. */
export const MAP_KEYS = ["english-town"] as const;
export type MapKey = (typeof MAP_KEYS)[number];

/** Bản đồ theo mã ngôn ngữ của vùng đất. Ngôn ngữ chưa có bản đồ thì dùng bãi cỏ mặc định. */
const MAP_BY_LANGUAGE: Record<string, MapKey> = { en: "english-town" };

export function mapForLanguage(languageCode: string): MapKey | null {
  return MAP_BY_LANGUAGE[languageCode.toLowerCase()] ?? null;
}
