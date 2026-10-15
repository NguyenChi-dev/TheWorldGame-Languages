/**
 * Đọc vùng đất / khu vực / kỹ năng cho các trang /lands/... (qua RLS, bằng phiên của người đang đăng nhập).
 * Không tìm thấy (hoặc mã sai định dạng, hoặc khu vực không thuộc vùng đất này) thì trả trang 404.
 * Dùng React cache: layout, breadcrumb và trang trong cùng 1 request chỉ đọc 1 lần.
 */
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isAreaScene, isSkillColorKey, isSkillIconKey, type Area, type Land, type Skill } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

export function toLand(row: Row): Land {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    languageCode: String(row.language_code),
    description: String(row.description ?? ""),
    coverMediaId: (row.cover_media_id as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
  };
}

export function toArea(row: Row): Area {
  if (!isAreaScene(row.scene)) {
    throw new Error(`Khu vực ${String(row.id)} có mẫu cảnh không có trong @lw/shared`);
  }
  return {
    id: String(row.id),
    landId: String(row.land_id),
    name: String(row.name),
    scene: row.scene,
    skillId: String(row.skill_id),
    coverMediaId: (row.cover_media_id as string | null) ?? null,
    unlockOrder: Number(row.unlock_order ?? 0),
    isActive: Boolean(row.is_active),
  };
}

/** Icon / màu lạ (sửa tay trong database) thì dùng mặc định thay vì làm hỏng trang. */
export function toSkill(row: Row): Skill {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    icon: isSkillIconKey(row.icon) ? row.icon : "book",
    color: isSkillColorKey(row.color) ? row.color : "slate",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

/** URL ảnh bìa từ cột nhúng `cover:media(secure_url)` của Supabase (null nếu chưa có ảnh). */
export function coverUrlOf(row: Row): string | null {
  const cover = Array.isArray(row.cover) ? row.cover[0] : row.cover;
  return cover && typeof cover === "object" && typeof (cover as Row).secure_url === "string"
    ? String((cover as Row).secure_url)
    : null;
}

/** Số lượng từ cột nhúng kiểu `areas(count)` của Supabase: [{ count: n }]. */
export function embeddedCount(value: unknown): number {
  return Array.isArray(value) && typeof value[0]?.count === "number" ? value[0].count : 0;
}

export const getLand = cache(async (landId: string): Promise<Land> => {
  if (!UUID.test(landId)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lands").select("*").eq("id", landId).maybeSingle();
  if (error) throw new Error(`Không đọc được vùng đất: ${error.message}`);
  if (!data) notFound();
  return toLand(data);
});

export const getArea = cache(async (landId: string, areaId: string): Promise<Area> => {
  if (!UUID.test(areaId)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("id", areaId)
    .eq("land_id", landId)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được khu vực: ${error.message}`);
  if (!data) notFound();
  return toArea(data);
});

/** Mọi kỹ năng luyện tập, theo thứ tự hiển thị. */
export const getSkills = cache(async (): Promise<Skill[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("skills").select("*").order("sort_order").order("name");
  if (error) throw new Error(`Không đọc được kỹ năng luyện tập: ${error.message}`);
  return data.map(toSkill);
});
