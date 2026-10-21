/**
 * Xác thực người chơi khi vào phòng realtime.
 *
 * Trình duyệt gửi access token Supabase (client.auth.token). Máy chủ:
 *   1. kiểm tra token (supabase.auth.getClaims: chữ ký JWT, hạn dùng);
 *   2. đọc hồ sơ CỦA CHÍNH người đó (bảng profiles, RLS) bằng token ấy: tên nhân vật, trang phục,
 *      vùng đất đang chọn.
 * Nhờ vậy tên / trang phục hiện cho người khác luôn là dữ liệu thật, trình duyệt không tự khai được.
 *
 * Chỉ dùng khóa publishable (công khai) + token của người chơi; không cần khóa bí mật.
 */
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_APPEARANCE, parseAppearance, type CharacterAppearance } from "@lw/shared";

export interface PlayerIdentity {
  userId: string;
  username: string;
  appearance: CharacterAppearance;
  landId: string | null;
}

export class AuthFailure extends Error {}

// Đọc biến môi trường lúc dùng (không đọc lúc nạp file): listen() nạp .env sau khi các file đã import.
export async function verifyPlayer(token: string | undefined): Promise<PlayerIdentity> {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new AuthFailure("Máy chủ realtime chưa cấu hình Supabase");
  if (!token) throw new AuthFailure("Chưa đăng nhập");

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: claims, error } = await supabase.auth
    .getClaims(token)
    .catch(() => ({ data: null, error: true }));
  const userId = claims?.claims?.sub;
  if (error || typeof userId !== "string") throw new AuthFailure("Phiên đăng nhập không hợp lệ");

  // getClaims chỉ kiểm tra chữ ký JWT tại chỗ: hỏi lại Supabase Auth để chặn người chơi đã bị khóa hoặc
  // phiên đã bị thu hồi (token cũ vẫn đúng chữ ký tới khi hết hạn ~1 giờ).
  const { data: account, error: accountError } = await supabase.auth
    .getUser(token)
    .catch(() => ({ data: { user: null }, error: true }));
  if (accountError || account.user?.id !== userId)
    throw new AuthFailure("Tài khoản đã bị khóa hoặc phiên đăng nhập đã hết hạn");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, appearance, land_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) throw new AuthFailure("Không đọc được hồ sơ người chơi");

  return {
    userId,
    username: typeof profile.username === "string" && profile.username ? profile.username : "Lữ khách",
    appearance: parseAppearance(profile.appearance) ?? DEFAULT_APPEARANCE,
    landId: typeof profile.land_id === "string" ? profile.land_id : null,
  };
}
