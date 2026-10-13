/** Slug: chỉ a-z, 0-9 và dấu gạch ngang, không bắt đầu/kết thúc bằng gạch ngang, không có "--". */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Mã ngôn ngữ 2–3 chữ thường, ví dụ "en", "ja", "vie". */
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}$/;

/**
 * Sinh slug từ tên tiếng Việt: bỏ dấu, đ → d, chữ thường, ký tự khác thành dấu gạch ngang.
 * Ví dụ: "Tiếng Anh" → "tieng-anh", "Đảo Mặt Trời!" → "dao-mat-troi".
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
