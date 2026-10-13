/**
 * Cách thế giới game được tổ chức:
 *
 *   Vùng đất (land)  = một ngôn ngữ, ví dụ "Tiếng Anh". Cấp lớn nhất.
 *   Khu vực (area)   = một địa điểm trong vùng đất (nông trại, rạp chiếu phim, công viên...).
 *                      Mỗi khu vực luyện MỘT kỹ năng và dùng một mẫu cảnh 3D.
 *   Bài học (lesson) = nằm trong một khu vực.
 *   Từ vựng (word)   = thuộc một vùng đất, được bài học dùng qua bảng nối lesson_words.
 *
 * Kỹ năng và mẫu cảnh là danh sách CỐ ĐỊNH trong code (mỗi kỹ năng cần mini-game riêng, mỗi cảnh
 * cần mô hình 3D riêng), không phải dữ liệu admin tự thêm. Phải khớp với enum area_skill và
 * area_scene trong supabase/migrations.
 */

export const SKILLS = [
  "vocabulary",
  "listening",
  "conversation",
  "reading",
  "writing",
  "grammar",
  "directions",
  "group_talk",
] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  vocabulary: "Từ vựng",
  listening: "Nghe",
  conversation: "Hội thoại",
  reading: "Đọc",
  writing: "Viết",
  grammar: "Ngữ pháp",
  directions: "Hỏi đường",
  group_talk: "Hội thoại nhóm",
};

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
  market: "Siêu thị / Chợ",
  cinema: "Rạp chiếu phim",
  cafe: "Quán cà phê",
  library: "Thư viện",
  post_office: "Bưu điện",
  school: "Trường học",
  suburb: "Ngoại ô",
  park: "Công viên",
};

/** Trạng thái bài học: nháp thì người chơi chưa thấy. */
export const LESSON_STATUSES = ["draft", "published"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
};

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

export const isSkill = (value: unknown): value is Skill => includes(SKILLS, value);
export const isAreaScene = (value: unknown): value is AreaScene => includes(AREA_SCENES, value);
export const isLessonStatus = (value: unknown): value is LessonStatus => includes(LESSON_STATUSES, value);
