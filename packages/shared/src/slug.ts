/** Slug: chỉ a-z, 0-9 và dấu gạch ngang, không bắt đầu/kết thúc bằng gạch ngang, không có "--". */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tên nhân vật: 3–32 ký tự gồm chữ (có dấu), số và ký tự đặc biệt, KHÔNG có dấu cách,
 * và phải có ÍT NHẤT 1 ký tự đặc biệt (ký tự không phải chữ / số, ví dụ _ . - ! @ # ★).
 * Ký tự điều khiển / ký tự ẩn không được dùng.
 * Database kiểm tra lại cùng quy tắc (migration 0005).
 */
export const USERNAME_PATTERN = /^(?=.*[^\p{L}\p{M}\p{N}])[^\s\p{C}]{3,32}$/u;
export const USERNAME_RULE =
  "Tên nhân vật gồm 3–32 ký tự, không có dấu cách, có ít nhất 1 ký tự đặc biệt (ví dụ _ ! @ #)";

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
