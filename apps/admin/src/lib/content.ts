/**
 * Đọc vùng đất / khu vực / bài học cho các trang /lands/... (qua RLS, bằng phiên của người đang đăng nhập).
 * Không tìm thấy (hoặc mã sai định dạng, hoặc khu vực không thuộc vùng đất này) thì trả trang 404.
 * Dùng React cache: layout, breadcrumb và trang trong cùng 1 request chỉ đọc 1 lần.
 */
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { isAreaScene, isLessonStatus, isSkill, type Area, type Land, type Lesson } from "@lw/shared";
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
  if (!isAreaScene(row.scene) || !isSkill(row.skill)) {
    throw new Error(`Khu vực ${String(row.id)} có cảnh/kỹ năng không có trong @lw/shared`);
  }
  return {
    id: String(row.id),
    landId: String(row.land_id),
    name: String(row.name),
    scene: row.scene,
    skill: row.skill,
    coverMediaId: (row.cover_media_id as string | null) ?? null,
    unlockOrder: Number(row.unlock_order ?? 0),
    unlockRequirement:
      row.unlock_requirement && typeof row.unlock_requirement === "object"
        ? (row.unlock_requirement as Record<string, unknown>)
        : {},
    isActive: Boolean(row.is_active),
  };
}

export function toLesson(row: Row): Lesson {
  return {
    id: String(row.id),
    areaId: String(row.area_id),
    title: String(row.title),
    status: isLessonStatus(row.status) ? row.status : "draft",
    position: Number(row.position ?? 0),
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

/** Nhãn ngắn của bài học trong breadcrumb, ví dụ "Bài 1". */
export const lessonLabel = (lesson: Lesson) => `Bài ${lesson.position}`;

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

export const getLesson = cache(async (areaId: string, lessonId: string): Promise<Lesson> => {
  if (!UUID.test(lessonId)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("area_id", areaId)
    .maybeSingle();
  if (error) throw new Error(`Không đọc được bài học: ${error.message}`);
  if (!data) notFound();
  return toLesson(data);
});
