// Test toàn bộ đường đi của một yêu cầu: token -> kiểm tra dữ liệu -> route.
// Supabase được thay bằng bản GIẢ (vi.mock), nên không cần kết nối dự án thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const PLAYER_TOKEN = "token-nguoi-choi";
const ADMIN_TOKEN = "token-admin";
const ADMIN_AAL1_TOKEN = "token-admin-chua-totp";
const EDITOR_TOKEN = "token-editor";
const MODERATOR_TOKEN = "token-moderator";
/** JWT đúng chữ ký (getClaims qua) nhưng phiên đã bị thu hồi / tài khoản bị khóa (getUser từ chối). */
const REVOKED_ADMIN_TOKEN = "token-admin-bi-thu-hoi";
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
  [REVOKED_ADMIN_TOKEN]: {
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
// Vùng đất đang bật duy nhất trong database giả.
const ACTIVE_LAND = vi.hoisted(() => "a1111111-1111-4111-8111-111111111111");

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
      getUser: async (token: string) => {
        if (token === REVOKED_ADMIN_TOKEN)
          return { data: { user: null }, error: { status: 403, code: "user_banned" } };
        const user = USERS[token];
        return user
          ? { data: { user: { id: user.sub } }, error: null }
          : { data: { user: null }, error: { status: 401 } };
      },
    },
    from: (table: string) => ({
      select: () => ({
        // admin_settings: công tắc 2 lớp (mặc định bật; test có thể tắt bằng settings.requireMfa).
        maybeSingle: async () => ({ data: { require_mfa: settings.requireMfa }, error: null }),
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({
            data:
              table === "profiles"
                ? {
                    role: Object.values(USERS).find((u) => u.sub === id)?.role,
                    username: "Mèo_Ú",
                    appearance: null,
                    land_id: null,
                  }
                : null,
            error: null,
          }),
          // lands.select("id").eq("id", ...).eq("is_active", true): chỉ ACTIVE_LAND đang bật.
          eq: () => ({
            maybeSingle: async () => ({
              data: table === "lands" && id === ACTIVE_LAND ? { id } : null,
              error: null,
            }),
          }),
        }),
      }),
      // profiles.update({ username }).eq("id", ...).select().maybeSingle(): tên "Trùng_Tên" giả lập trùng.
      update: (values: { username?: string; appearance?: object; land_id?: string }) => ({
        eq: (_column: string, id: string) => ({
          select: () => ({
            maybeSingle: async () =>
              values.username === "Trùng_Tên"
                ? { data: null, error: { code: "23505", message: "duplicate key" } }
                : {
                    data: {
                      username: "Mèo_Ú",
                      appearance: null,
                      land_id: null,
                      ...values,
                      role: Object.values(USERS).find((u) => u.sub === id)?.role,
                    },
                    error: null,
                  },
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
  it("trả về id, email (từ token) và tên nhân vật, vai trò (từ database)", async () => {
    const res = await app.request("/me", asUser(PLAYER_TOKEN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: USERS[PLAYER_TOKEN].sub,
      email: "an@example.com",
      username: "Mèo_Ú",
      role: "player",
      appearance: null,
      landId: null,
    });
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

describe("PATCH /me", () => {
  const patch = (token: string, body: unknown) =>
    app.request("/me", asUser(token, { method: "PATCH", body: JSON.stringify(body) }));

  it("đổi tên nhân vật của chính mình", async () => {
    const res = await patch(PLAYER_TOKEN, { username: "  Mèo_Mập " });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: USERS[PLAYER_TOKEN].sub,
      username: "Mèo_Mập",
      role: "player",
    });
  });

  it("tên sai định dạng: 400 nêu tên trường", async () => {
    const res = await patch(PLAYER_TOKEN, { username: "a b" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ: username" });
  });

  const look = { gender: "male", hat: "bearskin", top: "kimono", bottom: "chima" };

  it("chọn nhân vật kèm tên: lưu cả hai (phối đồ tự do)", async () => {
    const res = await patch(PLAYER_TOKEN, { username: "Mèo_Mập", appearance: look });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ username: "Mèo_Mập", appearance: look });
  });

  it("chỉ đổi ngoại hình, giữ nguyên tên", async () => {
    const res = await patch(PLAYER_TOKEN, { appearance: look });
    expect(await res.json()).toMatchObject({ username: "Mèo_Ú", appearance: look });
  });

  it.each([
    [{ ...look, hat: "rong" }, "appearance.hat"],
    [{ ...look, gender: "khac" }, "appearance.gender"],
    [{ gender: "male", hat: "none", top: "aodai" }, "appearance.bottom"],
    [{ ...look, mau: "do" }, "appearance"],
  ])("ngoại hình sai %j: 400 nêu trường", async (appearance, field) => {
    const res = await patch(PLAYER_TOKEN, { appearance });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: `Dữ liệu gửi lên không hợp lệ: ${field}` });
  });

  it("không gửi gì: 400", async () => {
    expect((await patch(PLAYER_TOKEN, {})).status).toBe(400);
  });

  it("chọn vùng đất đang bật: lưu landId", async () => {
    const res = await patch(PLAYER_TOKEN, { landId: ACTIVE_LAND });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ landId: ACTIVE_LAND });
  });

  it("vùng đất không có / đang tắt: 404, không lưu", async () => {
    const res = await patch(PLAYER_TOKEN, { landId: "b2222222-2222-4222-8222-222222222222" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Vùng đất không tồn tại hoặc đang đóng" });
  });

  it("landId không phải uuid: 400", async () => {
    const res = await patch(PLAYER_TOKEN, { landId: "tieng-anh" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ: landId" });
  });

  it("trùng tên: 409", async () => {
    const res = await patch(PLAYER_TOKEN, { username: "Trùng_Tên" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Tên nhân vật này đã có người dùng" });
  });

  it("gửi kèm role cũng không đổi được vai trò (chỉ nhận username)", async () => {
    const res = await patch(PLAYER_TOKEN, { username: "Mèo_Mới", role: "admin" });
    expect(((await res.json()) as { role: string }).role).toBe("player");
  });

  it("chưa đăng nhập: 401", async () => {
    const res = await app.request("/me", { method: "PATCH", body: "{}" });
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

describe("Phiên bị thu hồi / tài khoản bị khóa (JWT vẫn đúng chữ ký)", () => {
  it("route quản trị trả 401, không trả dữ liệu", async () => {
    const res = await app.request("/admin/me", asUser(REVOKED_ADMIN_TOKEN));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  });

  it("route của người chơi (/me) cũng trả 401: người chơi bị khóa không sửa được hồ sơ", async () => {
    expect((await app.request("/me", asUser(REVOKED_ADMIN_TOKEN))).status).toBe(401);
    const res = await app.request("/me", {
      ...asUser(REVOKED_ADMIN_TOKEN),
      method: "PATCH",
      body: JSON.stringify({ username: "Mèo_Mới!" }),
    });
    expect(res.status).toBe(401);
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
