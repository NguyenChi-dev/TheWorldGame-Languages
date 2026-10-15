/**
 * Schema Zod cho dữ liệu admin GỬI LÊN khi tạo/sửa Vùng đất, Khu vực và Kỹ năng luyện tập.
 * apps/admin (server action) dùng để kiểm tra; game/app khác dùng chung cùng quy tắc.
 *
 * Nhập từ "@lw/shared/schemas" (không phải "@lw/shared") để gói khác không phải kéo theo Zod.
 */
import { z } from "zod";
import { LANGUAGE_CODE_PATTERN, SLUG_PATTERN } from "./slug";
import { AREA_SCENES, SKILL_COLOR_KEYS, SKILL_ICON_KEYS } from "./world";

const optionalMediaId = z
  .union([z.uuid({ error: "Mã ảnh bìa phải là UUID" }), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const LandInput = z.object({
  name: z.string().trim().min(1, "Nhập tên vùng đất").max(80, "Tên tối đa 80 ký tự"),
  slug: z
    .string()
    .trim()
    .min(1, "Nhập slug")
    .max(60, "Slug tối đa 60 ký tự")
    .regex(SLUG_PATTERN, "Slug chỉ gồm chữ thường a-z, số 0-9 và dấu gạch ngang (ví dụ tieng-anh)"),
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(LANGUAGE_CODE_PATTERN, "Mã ngôn ngữ gồm 2–3 chữ cái thường (ví dụ en, ja)"),
  description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự").default(""),
  coverMediaId: optionalMediaId,
});
export type LandInput = z.input<typeof LandInput>;
export type LandInputParsed = z.output<typeof LandInput>;

export const AreaInput = z.object({
  name: z.string().trim().min(1, "Nhập tên khu vực").max(80, "Tên tối đa 80 ký tự"),
  skillId: z.uuid({ error: "Chọn kỹ năng" }),
  scene: z.enum(AREA_SCENES, { error: "Chọn mẫu cảnh" }),
  coverMediaId: optionalMediaId,
});
export type AreaInput = z.input<typeof AreaInput>;
export type AreaInputParsed = z.output<typeof AreaInput>;

export const SkillInput = z.object({
  name: z.string().trim().min(1, "Nhập tên kỹ năng").max(60, "Tên tối đa 60 ký tự"),
  description: z.string().trim().max(300, "Mô tả tối đa 300 ký tự").default(""),
  icon: z.enum(SKILL_ICON_KEYS, { error: "Chọn icon" }),
  color: z.enum(SKILL_COLOR_KEYS, { error: "Chọn màu" }),
});
export type SkillInput = z.input<typeof SkillInput>;
export type SkillInputParsed = z.output<typeof SkillInput>;

/** Danh sách id để đổi thứ tự: UUID, không trùng. */
export const IdList = z
  .array(z.uuid({ error: "Mã không hợp lệ" }))
  .min(1, "Danh sách trống")
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, "Danh sách có mã bị trùng");
