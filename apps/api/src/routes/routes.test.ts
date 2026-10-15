// Test toàn bộ đường đi của một yêu cầu: token -> kiểm tra dữ liệu -> route.
// Supabase được thay bằng bản GIẢ (vi.mock), nên không cần kết nối dự án thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const PLAYER_TOKEN = "token-nguoi-choi";
const ADMIN_TOKEN = "token-admin";
const ADMIN_AAL1_TOKEN = "token-admin-chua-totp";
const EDITOR_TOKEN = "token-editor";
const MODERATOR_TOKEN = "token-moderator";
// aal: "aal2" = token đã qua xác thực hai lớp (TOTP), "aal1" = mới nhập mật khẩu.
const USERS: Record<string, { sub: string; email: string; role: string; aal: string }> = {
  [PLAYER_TOKEN]: {
    sub: "11111111-1111-4111-8111-111111111111",
    email: "an@example.com",
    role: "player",
    aal: "aal2",
  },
  [ADMIN_TOKEN]: {
    sub: "22222222-2222-4222-8222-222222222222",
    email: "admin@example.com",
    role: "admin",
    aal: "aal2",
  },
  [ADMIN_AAL1_TOKEN]: {
    sub: "22222222-2222-4222-8222-222222222222",
    email: "admin@example.com",
    role: "admin",
    aal: "aal1",
  },
  [EDITOR_TOKEN]: {
    sub: "33333333-3333-4333-8333-333333333333",
    email: "editor@example.com",
    role: "editor",
    aal: "aal2",
  },
  [MODERATOR_TOKEN]: {
    sub: "44444444-4444-4444-8444-444444444444",
    email: "mod@example.com",
    role: "moderator",
    aal: "aal2",
  },
};

// Công tắc admin_settings.require_mfa trong database giả. vi.hoisted: dùng được bên trong vi.mock.
const settings = vi.hoisted(() => ({ requireMfa: true }));

// Supabase giả: getClaims nhận các token ở trên, from("profiles") trả về vai trò tương ứng.
vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getClaims: async (token: string) => {
        // Giống Supabase thật: có loại token rác làm getClaims ném lỗi thay vì trả về error.
        if (token === "token-lam-hong") throw new Error("Invalid UTF-8 sequence");
        const user = USERS[token];
        return user
          ? {
              data: { claims: { sub: user.sub, email: user.email, role: "authenticated", aal: user.aal } },
              error: null,
            }
          : { data: null, error: new Error("invalid JWT") };
      },
    },
    from: (table: string) => ({
      select: () => ({
        // admin_settings: công tắc 2 lớp (mặc định bật; test có thể tắt bằng settings.requireMfa).
        maybeSingle: async () => ({ data: { require_mfa: settings.requireMfa }, error: null }),
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({
            data:
              table === "profiles" ? { role: Object.values(USERS).find((u) => u.sub === id)?.role } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

const { app } = await import("../app");

const asUser = (token: string, init: RequestInit = {}) => ({
  ...init,
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
});

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("GET /me", () => {
  it("trả về id và email lấy từ token", async () => {
    const res = await app.request("/me", asUser(PLAYER_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: USERS[PLAYER_TOKEN].sub, email: "an@example.com" });
  });

  it("token sai trả 401", async () => {
    const res = await app.request("/me", asUser("token-gia-mao"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  });

  it("token rác làm Supabase ném lỗi vẫn trả 401, không phải 500", async () => {
    const res = await app.request("/me", asUser("token-lam-hong"));
    expect(res.status).toBe(401);
  });
});

describe("Quyền vào route quản trị (GET /admin/me)", () => {
  it("người chơi thường bị chặn 403", async () => {
    const res = await app.request("/admin/me", asUser(PLAYER_TOKEN));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Bạn không có quyền truy cập trang quản trị" });
  });

  it.each([ADMIN_TOKEN, EDITOR_TOKEN, MODERATOR_TOKEN])("nhân viên (%s) vào được", async (token) => {
    const res = await app.request("/admin/me", asUser(token));
    expect(res.status).toBe(200);
  });

  it("công tắc 2 lớp đang tắt: admin aal1 đi qua, người chơi vẫn bị chặn", async () => {
    settings.requireMfa = false;
    try {
      expect((await app.request("/admin/me", asUser(ADMIN_AAL1_TOKEN))).status).toBe(200);
      expect((await app.request("/admin/me", asUser(PLAYER_TOKEN))).status).toBe(403);
    } finally {
      settings.requireMfa = true;
    }
  });

  it("admin mới nhập mật khẩu (aal1, chưa TOTP) bị chặn 403", async () => {
    const res = await app.request("/admin/me", asUser(ADMIN_AAL1_TOKEN));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Cần xác thực hai lớp (TOTP) trước khi dùng chức năng quản trị",
    });
  });
});

describe("GET /admin/me", () => {
  it("trả về id, email và vai trò lấy từ database", async () => {
    const res = await app.request("/admin/me", asUser(EDITOR_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: USERS[EDITOR_TOKEN].sub,
      email: "editor@example.com",
      role: "editor",
    });
  });

  it("chưa đăng nhập trả 401, người chơi trả 403", async () => {
    expect((await app.request("/admin/me")).status).toBe(401);
    expect((await app.request("/admin/me", asUser(PLAYER_TOKEN))).status).toBe(403);
  });
});
