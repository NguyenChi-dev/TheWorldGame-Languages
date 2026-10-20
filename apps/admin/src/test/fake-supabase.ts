// Client Supabase giả cho test: chỉ đủ các hàm mà lib/auth, lib/audit và server action dùng.
import { vi } from "vitest";

export interface FakeUser {
  id?: string;
  email?: string;
  /** Giá trị cột profiles.role; null = chưa có hồ sơ. */
  role: string | null;
  aal?: "aal1" | "aal2";
  /** Công tắc admin_settings.require_mfa trả về từ rpc("admin_mfa_required"); mặc định true. */
  mfaRequired?: boolean;
  /**
   * Kết quả hỏi Supabase Auth (getUser): "ok" (mặc định), "revoked" (phiên bị thu hồi / tài khoản bị khóa:
   * JWT vẫn đúng chữ ký nhưng máy chủ từ chối), "offline" (mất kết nối).
   */
  account?: "ok" | "revoked" | "offline";
}

export function fakeSupabase(user: FakeUser | null) {
  const id = user?.id ?? "00000000-0000-4000-8000-000000000001";
  const claims = user
    ? { sub: id, email: user.email ?? "test@lw.test", role: "authenticated", aal: user.aal ?? "aal2" }
    : null;

  const insert = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => query);
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    update,
    insert,
    maybeSingle: vi.fn(async () => ({ data: user?.role ? { id, role: user.role } : null, error: null })),
  };

  return {
    client: {
      auth: {
        getClaims: vi.fn(async () => ({ data: claims ? { claims } : null, error: null })),
        getUser: vi.fn(async () => {
          if (user?.account === "offline") throw Object.assign(new TypeError("fetch failed"), { status: 0 });
          if (user?.account === "revoked")
            return {
              data: { user: null },
              error: { status: 403, code: "user_banned", name: "AuthApiError" },
            };
          return { data: { user: claims ? { id } : null }, error: null };
        }),
      },
      from: vi.fn(() => query),
      rpc: vi.fn(async () => ({ data: user?.mfaRequired ?? true, error: null })),
    },
    insert,
    update,
  };
}
