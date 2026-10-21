import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { USERNAME_RULE } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";
import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signOut,
  signOutEverywhere,
  signUp,
  updatePassword,
} from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type AuthError = { code?: string; status?: number; name?: string } | null;

/** Supabase giả: mỗi hàm trả về kết quả cấu hình sẵn, ghi lại tham số được gọi. */
function fakeSupabase(
  options: {
    signInError?: AuthError;
    signUp?: { session?: object | null; identities?: unknown[]; error?: AuthError };
    usernameAvailable?: boolean;
    resendError?: AuthError;
    resetError?: AuthError;
    user?: object | null;
    updateError?: AuthError;
  } = {},
) {
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: {}, error: options.signInError ?? null })),
    signUp: vi.fn(async () => ({
      data: {
        user: { id: "u1", identities: options.signUp?.identities ?? [{ id: "i1" }] },
        session: options.signUp?.session ?? null,
      },
      error: options.signUp?.error ?? null,
    })),
    resend: vi.fn(async () => ({ data: {}, error: options.resendError ?? null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: options.resetError ?? null })),
    getUser: vi.fn(async () => ({
      data: { user: options.user === undefined ? { id: "u1" } : options.user },
    })),
    updateUser: vi.fn(async () => ({ data: {}, error: options.updateError ?? null })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  const rpc = vi.fn(async () => ({ data: options.usernameAvailable ?? true, error: null }));
  vi.mocked(createClient).mockResolvedValue({ auth, rpc } as never);
  return { auth, rpc };
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const signUpForm = (overrides: Record<string, string> = {}) =>
  form({
    username: "Mèo_Ú",
    email: "Moi@LW.test",
    password: "matkhau-dai",
    confirmPassword: "matkhau-dai",
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("đăng nhập", () => {
  it("đúng: vào game, email viết thường", async () => {
    const { auth } = fakeSupabase();
    await signIn({}, form({ email: " An@LW.test ", password: "matkhau-dai" }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "an@lw.test", password: "matkhau-dai" });
    expect(redirect).toHaveBeenCalledWith("/play");
  });

  it("sai mật khẩu: báo chung, không nói email có tồn tại hay không", async () => {
    fakeSupabase({ signInError: { code: "invalid_credentials" } });
    expect(await signIn({}, form({ email: "an@lw.test", password: "sai" }))).toEqual({
      values: { email: "an@lw.test" },
      error: "Email hoặc mật khẩu không đúng",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "user_banned", status: 400 }, "Tài khoản đã bị khóa"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "Không kết nối được máy chủ"],
    [{ status: 503 }, "đang gặp sự cố"],
  ])("lỗi %j: thông báo dễ hiểu", async (signInError, message) => {
    fakeSupabase({ signInError });
    expect((await signIn({}, form({ email: "an@lw.test", password: "matkhau-dai" }))).error).toContain(
      message,
    );
  });

  it("chưa xác nhận email: trả code để giao diện hiện nút gửi lại", async () => {
    fakeSupabase({ signInError: { code: "email_not_confirmed" } });
    const result = await signIn({}, form({ email: "an@lw.test", password: "matkhau-dai" }));
    expect(result.code).toBe("email_not_confirmed");
  });

  it("thiếu email / mật khẩu: không gọi Supabase", async () => {
    expect(await signIn({}, form({ email: "", password: "" }))).toMatchObject({
      error: "Nhập email và mật khẩu",
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("tạo tài khoản", () => {
  it.each([
    [{ username: "a_" }, USERNAME_RULE],
    [{ username: "có_dấu cách" }, USERNAME_RULE],
    [{ username: "KhongCoKyTuDacBiet" }, USERNAME_RULE],
    [{ email: "khong-phai-email" }, "Email không hợp lệ"],
    [{ password: "ngan", confirmPassword: "ngan" }, "Mật khẩu tối thiểu 8 ký tự"],
    [{ confirmPassword: "khac-hoan-toan" }, "Mật khẩu nhập lại không khớp"],
  ])("dữ liệu sai %j: báo lỗi, không gọi Supabase", async (overrides, message) => {
    expect((await signUp({}, signUpForm(overrides))).error).toBe(message);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("tạo tài khoản (SIGNUP_REQUIRE_EMAIL_CONFIRM=true: xác nhận qua email)", () => {
  beforeEach(() => {
    process.env.SIGNUP_REQUIRE_EMAIL_CONFIRM = "true";
  });
  afterEach(() => {
    delete process.env.SIGNUP_REQUIRE_EMAIL_CONFIRM;
  });

  it("tên nhân vật đã có người dùng: không tạo tài khoản", async () => {
    const { auth, rpc } = fakeSupabase({ usernameAvailable: false });
    expect((await signUp({}, signUpForm())).error).toBe(
      "Tên nhân vật này đã có người dùng, hãy chọn tên khác",
    );
    expect(rpc).toHaveBeenCalledWith("username_available", { p_username: "Mèo_Ú" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("thành công (bật xác nhận email): chỉ gửi username, link xác nhận về /auth/callback", async () => {
    const { auth } = fakeSupabase();
    expect(await signUp({}, signUpForm())).toEqual({
      values: { email: "moi@lw.test" },
      message: "Đã gửi email xác nhận tới moi@lw.test. Bấm link trong email để vào game.",
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "moi@lw.test",
      password: "matkhau-dai",
      options: { data: { username: "Mèo_Ú" }, emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("tắt xác nhận email (có phiên ngay): vào game", async () => {
    fakeSupabase({ signUp: { session: { access_token: "t" } } });
    await signUp({}, signUpForm());
    expect(redirect).toHaveBeenCalledWith("/play");
  });

  it("email đã có tài khoản (Supabase trả user không có identities): báo trùng", async () => {
    fakeSupabase({ signUp: { identities: [] } });
    expect((await signUp({}, signUpForm())).error).toBe("Email này đã có tài khoản, hãy đăng nhập");
  });

  it("gửi email quá nhiều lần: báo chờ", async () => {
    fakeSupabase({ signUp: { error: { code: "over_email_send_rate_limit" } } });
    expect((await signUp({}, signUpForm())).error).toBe("Gửi email quá nhiều lần, thử lại sau ít phút");
  });
});

describe("tạo tài khoản (mặc định: qua apps/api, không cần email)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("thành công: gọi POST /auth/signup, đăng nhập luôn rồi vào game", async () => {
    const { auth } = fakeSupabase();
    reply(200, { id: "u1", email: "moi@lw.test", username: "Mèo_Ú" });
    await signUp({}, signUpForm());
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "moi@lw.test", password: "matkhau-dai", username: "Mèo_Ú" }),
      cache: "no-store",
    });
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "moi@lw.test", password: "matkhau-dai" });
    expect(redirect).toHaveBeenCalledWith("/play");
  });

  it("API báo lỗi (ví dụ trùng email): hiện nguyên thông báo, không đăng nhập", async () => {
    const { auth } = fakeSupabase();
    reply(409, { error: "Email này đã có tài khoản, hãy đăng nhập" });
    expect((await signUp({}, signUpForm())).error).toBe("Email này đã có tài khoản, hãy đăng nhập");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("không kết nối được API: báo lỗi dễ hiểu", async () => {
    fakeSupabase();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect((await signUp({}, signUpForm())).error).toBe("Không kết nối được máy chủ, thử lại sau");
  });
});

describe("gửi lại email xác nhận / quên mật khẩu", () => {
  it("gửi lại email xác nhận: trả lời như nhau dù email có tài khoản hay không", async () => {
    const { auth } = fakeSupabase();
    expect((await resendConfirmation({}, form({ email: "an@lw.test" }))).message).toBe(
      "Nếu an@lw.test đang chờ xác nhận, email mới đã được gửi.",
    );
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "an@lw.test",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("quên mật khẩu: link về /auth/callback rồi tới /reset-password", async () => {
    const { auth } = fakeSupabase();
    const result = await requestPasswordReset({}, form({ email: "An@lw.test" }));
    expect(result.message).toContain("Nếu an@lw.test có tài khoản");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("an@lw.test", {
      redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
    });
  });

  it("quên mật khẩu: lỗi khác (ví dụ email không tồn tại) vẫn trả lời chung", async () => {
    fakeSupabase({ resetError: { code: "user_not_found" } });
    expect((await requestPasswordReset({}, form({ email: "la@lw.test" }))).error).toBeUndefined();
  });

  it("quên mật khẩu: gửi quá nhiều lần thì báo chờ", async () => {
    fakeSupabase({ resetError: { code: "over_email_send_rate_limit" } });
    expect((await requestPasswordReset({}, form({ email: "an@lw.test" }))).error).toBe(
      "Gửi email quá nhiều lần, thử lại sau ít phút",
    );
  });
});

describe("đặt mật khẩu mới", () => {
  const pw = (password: string, confirmPassword = password) => form({ password, confirmPassword });

  it("thành công: lưu mật khẩu rồi vào game", async () => {
    const { auth } = fakeSupabase();
    await updatePassword({}, pw("matkhau-moi-1"));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "matkhau-moi-1" });
    expect(redirect).toHaveBeenCalledWith("/play");
  });

  it("không có phiên (link hết hạn): không đổi gì", async () => {
    const { auth } = fakeSupabase({ user: null });
    expect((await updatePassword({}, pw("matkhau-moi-1"))).error).toContain("đã hết hạn");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("trùng mật khẩu cũ: báo lỗi tiếng Việt", async () => {
    fakeSupabase({ updateError: { code: "same_password" } });
    expect((await updatePassword({}, pw("matkhau-cu-11"))).error).toBe("Mật khẩu mới phải khác mật khẩu cũ");
  });

  it("nhập lại không khớp: không gọi Supabase", async () => {
    expect((await updatePassword({}, pw("matkhau-moi-1", "khac"))).error).toBe(
      "Mật khẩu nhập lại không khớp",
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("đăng xuất", () => {
  it("thiết bị này: scope local, về trang chủ", async () => {
    const { auth } = fakeSupabase();
    await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("mọi thiết bị: scope global", async () => {
    const { auth } = fakeSupabase();
    await signOutEverywhere();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
