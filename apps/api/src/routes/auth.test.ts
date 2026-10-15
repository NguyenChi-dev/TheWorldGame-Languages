// Test POST /auth/signup với Supabase GIẢ: không tạo tài khoản thật.
import { beforeEach, describe, expect, it, vi } from "vitest";

const supa = vi.hoisted(() => ({
  available: true,
  createError: null as null | { code: string; message: string },
  created: [] as Record<string, unknown>[],
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    rpc: async () => ({ data: supa.available, error: null }),
    auth: {
      admin: {
        createUser: async (attrs: Record<string, unknown>) => {
          if (supa.createError) return { data: { user: null }, error: supa.createError };
          supa.created.push(attrs);
          return { data: { user: { id: "u-moi" } }, error: null };
        },
      },
    },
  }),
}));

const { app } = await import("../app");
const { resetSignUpLimits } = await import("./auth");

const signUp = (body: unknown, ip = "1.2.3.4") =>
  app.request("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  });
const valid = { email: " Moi@LW.test ", password: "matkhau-dai", username: "Mèo_Ú" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  supa.available = true;
  supa.createError = null;
  supa.created = [];
  resetSignUpLimits();
});

describe("POST /auth/signup", () => {
  it("tạo tài khoản đã xác nhận sẵn, chỉ gửi username trong metadata", async () => {
    const res = await signUp(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u-moi", email: "moi@lw.test", username: "Mèo_Ú" });
    expect(supa.created).toEqual([
      {
        email: "moi@lw.test",
        password: "matkhau-dai",
        email_confirm: true,
        user_metadata: { username: "Mèo_Ú" },
      },
    ]);
  });

  it("gửi kèm role trong body cũng bị bỏ qua", async () => {
    await signUp({ ...valid, role: "admin" });
    expect(supa.created[0]).not.toHaveProperty("role");
    expect(supa.created[0].user_metadata).toEqual({ username: "Mèo_Ú" });
  });

  it.each([
    [{ ...valid, username: "KhongDacBiet" }, "username"],
    [{ ...valid, email: "khong-phai-email" }, "email"],
    [{ ...valid, password: "ngan" }, "password"],
  ])("dữ liệu sai %j: 400 nêu tên trường", async (body, field) => {
    const res = await signUp(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: `Dữ liệu gửi lên không hợp lệ: ${field}` });
    expect(supa.created).toEqual([]);
  });

  it("tên nhân vật đã có người dùng: 409, không tạo tài khoản", async () => {
    supa.available = false;
    const res = await signUp(valid);
    expect(res.status).toBe(409);
    expect(supa.created).toEqual([]);
  });

  it("email đã có tài khoản: 409 tiếng Việt", async () => {
    supa.createError = { code: "email_exists", message: "already registered" };
    const res = await signUp(valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Email này đã có tài khoản, hãy đăng nhập" });
  });

  it("quá 10 lần / 10 phút từ cùng 1 IP: 429; IP khác vẫn tạo được", async () => {
    for (let i = 0; i < 10; i++) expect((await signUp(valid, "9.9.9.9")).status).toBe(200);
    const blocked = await signUp(valid, "9.9.9.9");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "Tạo tài khoản quá nhiều lần, thử lại sau ít phút" });
    expect((await signUp(valid, "8.8.8.8")).status).toBe(200);
  });
});
