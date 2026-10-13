// Test toàn bộ đường đi của một yêu cầu: token -> kiểm tra dữ liệu -> route.
// Supabase được thay bằng bản GIẢ (vi.mock), nên không cần kết nối dự án thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const PLAYER_TOKEN = "token-nguoi-choi";
const ADMIN_TOKEN = "token-admin";
const USERS: Record<string, { sub: string; email: string; role: string }> = {
  [PLAYER_TOKEN]: { sub: "11111111-1111-4111-8111-111111111111", email: "an@example.com", role: "player" },
  [ADMIN_TOKEN]: { sub: "22222222-2222-4222-8222-222222222222", email: "admin@example.com", role: "admin" },
};

// Supabase giả: getClaims nhận 2 token ở trên, from("profiles") trả về vai trò tương ứng.
vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getClaims: async (token: string) => {
        // Giống Supabase thật: có loại token rác làm getClaims ném lỗi thay vì trả về error.
        if (token === "token-lam-hong") throw new Error("Invalid UTF-8 sequence");
        const user = USERS[token];
        return user
          ? { data: { claims: { sub: user.sub, email: user.email, role: "authenticated" } }, error: null }
          : { data: null, error: new Error("invalid JWT") };
      },
    },
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({
            data: { role: Object.values(USERS).find((u) => u.sub === id)?.role },
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

describe("POST /farm/harvest", () => {
  it("dữ liệu đúng thì tới được route khung và nhận 501", async () => {
    const body = JSON.stringify({ plotId: "33333333-3333-4333-8333-333333333333" });
    const res = await app.request("/farm/harvest", asUser(PLAYER_TOKEN, { method: "POST", body }));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Chưa làm" });
  });

  it("thiếu plotId thì trả 400 và nêu tên trường", async () => {
    const res = await app.request("/farm/harvest", asUser(PLAYER_TOKEN, { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ: plotId" });
  });

  it("JSON hỏng trả 400 tiếng Việt, không lộ lỗi nội bộ", async () => {
    const res = await app.request("/farm/harvest", asUser(PLAYER_TOKEN, { method: "POST", body: "{hỏng" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ" });
  });
});

describe("POST /lessons/:id/submit", () => {
  it("kiểm tra cả tham số đường dẫn lẫn nội dung", async () => {
    const body = JSON.stringify({ answers: [{ wordId: "en-carrot", answer: "cà rốt" }] });
    const res = await app.request(
      "/lessons/vegetables-1/submit",
      asUser(PLAYER_TOKEN, { method: "POST", body }),
    );
    expect(res.status).toBe(501);
  });
});

describe("GET /admin/stats", () => {
  it("người chơi thường bị chặn 403", async () => {
    const res = await app.request("/admin/stats", asUser(PLAYER_TOKEN));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Bạn không có quyền truy cập trang quản trị" });
  });

  it("admin đi qua được tới route khung", async () => {
    const res = await app.request("/admin/stats?days=30", asUser(ADMIN_TOKEN));
    expect(res.status).toBe(501);
  });

  it("query sai (days=1000) trả 400", async () => {
    const res = await app.request("/admin/stats?days=1000", asUser(ADMIN_TOKEN));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ: days" });
  });
});
