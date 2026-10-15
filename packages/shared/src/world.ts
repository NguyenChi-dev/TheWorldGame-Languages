/**
 * Cách thế giới game được tổ chức:
 *
 *   Vùng đất (land)  = một ngôn ngữ, ví dụ "Tiếng Anh". Cấp lớn nhất.
 *   Khu vực (area)   = một địa điểm trong vùng đất (nông trại, rạp chiếu phim, công viên...).
 *                      Mỗi khu vực luyện MỘT kỹ năng và dùng một mẫu cảnh 3D.
 *   Kỹ năng (skill)  = dữ liệu trong bảng skills, admin tự thêm / sửa / xóa, dùng chung mọi vùng đất.
 *
 * Mẫu cảnh là danh sách CỐ ĐỊNH trong code (mỗi cảnh cần mô hình 3D riêng), phải khớp enum
 * area_scene trong supabase/migrations. Icon và màu của kỹ năng cũng chọn trong danh sách cố định
 * dưới đây (giao diện có sẵn icon / màu tương ứng).
 */

/** Icon chọn được cho kỹ năng (tên icon Font Awesome, bỏ tiền tố "fa-"). */
export const SKILL_ICON_KEYS = [
  "book",
  "book-open",
  "headphones",
  "comments",
  "microphone",
  "pen-nib",
  "spell-check",
  "signs-post",
  "people-group",
  "language",
  "puzzle-piece",
  "music",
  "gamepad",
  "star",
] as const;
export type SkillIconKey = (typeof SKILL_ICON_KEYS)[number];

/** Màu chọn được cho nhãn kỹ năng. */
export const SKILL_COLOR_KEYS = [
  "pink",
  "rose",
  "orange",
  "amber",
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "slate",
] as const;
export type SkillColorKey = (typeof SKILL_COLOR_KEYS)[number];

/** Mẫu cảnh 3D của khu vực. */
export const AREA_SCENES = [
  "farm",
  "market",
  "cinema",
  "cafe",
  "library",
  "post_office",
  "school",
  "suburb",
  "park",
] as const;
export type AreaScene = (typeof AREA_SCENES)[number];

export const AREA_SCENE_LABELS: Record<AreaScene, string> = {
  farm: "Nông trại",
  market: "Chợ / siêu thị",
  cinema: "Rạp chiếu phim",
  cafe: "Quán cà phê",
  library: "Thư viện",
  post_office: "Bưu điện",
  school: "Trường học",
  suburb: "Ngoại ô",
  park: "Công viên",
};

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

export const isSkillIconKey = (value: unknown): value is SkillIconKey => includes(SKILL_ICON_KEYS, value);
export const isSkillColorKey = (value: unknown): value is SkillColorKey => includes(SKILL_COLOR_KEYS, value);
export const isAreaScene = (value: unknown): value is AreaScene => includes(AREA_SCENES, value);
