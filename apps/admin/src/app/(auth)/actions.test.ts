import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { signUp } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3001" }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function fakeAuth(result: { session?: object | null; errorCode?: string }) {
  const auth = {
    signUp: vi.fn(async () => ({
      data: { user: { id: "u1" }, session: result.session ?? null },
      error: result.errorCode ? { code: result.errorCode } : null,
    })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
  return auth;
}

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields = {
    email: "Moi@LW.test",
    username: "nguoi_moi",
    password: "matkhau-dai",
    confirmPassword: "matkhau-dai",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("server action signUp", () => {
  it.each([
    [{ email: "khong-phai-email" }, "Email không hợp lệ"],
    [{ username: "ab" }, "Tên hiển thị gồm 3–32 chữ, số, dấu _ . -"],
    [{ password: "ngan", confirmPassword: "ngan" }, "Mật khẩu tối thiểu 8 ký tự"],
    [{ confirmPassword: "khac-hoan-toan" }, "Mật khẩu nhập lại không khớp"],
  ])("kiểm tra dữ liệu %j trước khi gọi Supabase", async (overrides, message) => {
    const auth = fakeAuth({});
    expect(await signUp({}, form(overrides))).toMatchObject({ error: message });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("có lỗi thì trả lại email và tên đã nhập để điền lại form, KHÔNG trả lại mật khẩu", async () => {
    fakeAuth({});
    const result = await signUp({}, form({ confirmPassword: "khac-hoan-toan" }));
    expect(result.values).toEqual({ email: "moi@lw.test", username: "nguoi_moi" });
    expect(JSON.stringify(result)).not.toContain("matkhau-dai");
  });

  it("chỉ gửi username trong metadata, không bao giờ gửi vai trò", async () => {
    const auth = fakeAuth({});
    await signUp({}, form({ role: "admin" }));
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "moi@lw.test",
      password: "matkhau-dai",
      options: { data: { username: "nguoi_moi" }, emailRedirectTo: "http://localhost:3001/auth/callback" },
    });
  });

  it("dự án bật xác nhận email: báo kiểm tra email", async () => {
    const auth = fakeAuth({ session: null });
    const result = await signUp({}, form());
    expect(result.message).toContain("Đã gửi email xác nhận tới moi@lw.test");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("dự án tắt xác nhận email: đăng xuất ngay vì tài khoản mới chưa có quyền", async () => {
    const auth = fakeAuth({ session: { access_token: "x" } });
    const result = await signUp({}, form());
    expect(result.message).toContain("báo admin cấp quyền");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("đổi mã lỗi của Supabase thành thông báo tiếng Việt", async () => {
    fakeAuth({ errorCode: "user_already_exists" });
    expect(await signUp({}, form())).toMatchObject({ error: "Email này đã có tài khoản, hãy đăng nhập" });
  });
});
