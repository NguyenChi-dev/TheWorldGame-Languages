/**
 * Đọc dữ liệu người chơi ở máy chủ (Server Component) bằng phiên đăng nhập của chính họ.
 * RLS: người chơi chỉ đọc được hồ sơ của mình và các vùng đất / khu vực đang bật.
 */
import { cloudinaryThumb, parseAppearance, type CharacterAppearance } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Bảng nối kiểu nhiều-một (profiles → lands, lands → media) trả về MỘT object, nhưng client chưa có
 * kiểu database nên đoán là mảng: chấp nhận cả hai.
 */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export interface PlayerLand {
  id: string;
  name: string;
  languageCode: string;
}

export interface PlayerProfile {
  username: string | null;
  email: string | null;
  /** null = chưa tạo nhân vật. */
  appearance: CharacterAppearance | null;
  /** null = chưa chọn vùng đất, hoặc vùng đất đã bị tắt / xóa. */
  land: PlayerLand | null;
}

/** Hồ sơ người đang đăng nhập; null nếu chưa đăng nhập. */
export async function getPlayerProfile(): Promise<PlayerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("username, appearance, land:lands!profiles_land_id_fkey(id, name, language_code, is_active)")
    .eq("id", user.id)
    .maybeSingle();
  // Nhân viên đọc được cả vùng đất đang tắt, nên kiểm tra is_active ở đây.
  const land = one(data?.land);
  return {
    username: typeof data?.username === "string" ? data.username : null,
    email: user.email ?? null,
    appearance: parseAppearance(data?.appearance),
    land: land?.is_active ? { id: land.id, name: land.name, languageCode: land.language_code } : null,
  };
}

/** Một vùng đất trên màn chọn vùng đất. */
export interface LandOption extends PlayerLand {
  description: string;
  /** Ảnh bìa đã thu nhỏ (Cloudinary), null nếu chưa có ảnh. */
  coverUrl: string | null;
  /** Số khu vực đang mở. */
  areaCount: number;
}

/** Các vùng đất đang bật, theo thứ tự admin sắp xếp. */
export async function getActiveLands(): Promise<LandOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lands")
    .select(
      "id, name, language_code, description, cover:media!lands_cover_media_id_fkey(secure_url), areas(count)",
    )
    .eq("is_active", true)
    .eq("areas.is_active", true)
    .order("sort_order");
  if (error) {
    console.error("[lands] Không đọc được vùng đất:", error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const cover = one(row.cover);
    const areas = row.areas as { count: number }[] | null;
    return {
      id: row.id as string,
      name: row.name as string,
      languageCode: row.language_code as string,
      description: (row.description as string) ?? "",
      coverUrl: cover?.secure_url ? cloudinaryThumb(cover.secure_url, 640, 800) : null,
      areaCount: areas?.[0]?.count ?? 0,
    };
  });
}
