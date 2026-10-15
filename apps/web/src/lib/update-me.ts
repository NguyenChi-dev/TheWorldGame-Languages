/**
 * Gọi apps/api PATCH /me từ máy chủ Next.js (server action), kèm token đăng nhập của chính người chơi.
 * apps/api kiểm tra token và chỉ sửa hồ sơ của người có token đó.
 */
import type { UpdateMeRequest } from "@lw/shared/api";
import { SERVER_API_URL } from "@/lib/server-api-url";
import { createClient } from "@/lib/supabase/server";

export type UpdateMeResult = { ok: true } | { ok: false; signedOut: true } | { ok: false; error: string };

export async function updateMe(body: UpdateMeRequest, fallbackError: string): Promise<UpdateMeResult> {
  const supabase = await createClient();
  // Chỉ lấy token để gửi đi; apps/api tự kiểm tra token với Supabase.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, signedOut: true };

  let response: Response;
  try {
    response = await fetch(`${SERVER_API_URL}/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ, thử lại sau" };
  }
  if (response.status === 401) return { ok: false, signedOut: true };
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? fallbackError };
  }
  return { ok: true };
}
