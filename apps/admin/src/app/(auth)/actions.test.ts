import { beforeEach, describe, expect, it, vi } from "vitest";
import { USERNAME_RULE } from "@lw/shared";
import { getSession, readMfaRequired } from "@/lib/auth";
import {
  SIGN_UP_FIELDS,
  SignUpInput,
  parseForm,
  signInErrorMessage,
  totpErrorMessage,
} from "@/lib/auth-schemas";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cancelTotpEnroll, signIn, signOut, signUp, startTotpEnroll, verifyTotp } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const cookieStore = vi.hoisted(() => ({
  getAll: vi.fn(() => [] as { name: string }[]),
  delete: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3001" }),
  cookies: async () => cookieStore,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn(), readMfaRequired: vi.fn() }));

const PASSWORD = "matkhau-dai-2026";

/** Supabase giả: đăng nhập, đọc vai trò, đăng xuất, TOTP. */
function fakeSupabase(
  options: {
    signInError?: { code?: string; status?: number; name?: string };
    signInThrows?: boolean;
    role?: string | null;
    profileError?: boolean;
    signUpSession?: object | null;
    signUpErrorCode?: string;
    signOutError?: boolean;
    verifyError?: boolean | { code?: string; status?: number };
    factors?: { id: string; factor_type: string; status: string }[];
  } = {},
) {
  const auth = {
    signInWithPassword: vi.fn(async () => {
      if (options.signInThrows) throw new TypeError("fetch failed");
      return options.signInError
        ? { data: { user: null, session: null }, error: options.signInError }
        : { data: { user: { id: "u1" }, session: {} }, error: null };
    }),
    signUp: vi.fn(async () => ({
      data: { user: { id: "u1" }, session: options.signUpSession ?? null },
      error: options.signUpErrorCode ? { code: options.signUpErrorCode } : null,
    })),
    signOut: vi.fn(async () => ({ error: options.signOutError ? { message: "network" } : null })),
    mfa: {
      listFactors: vi.fn(async () => ({
        data: {
          totp: (options.factors ?? [{ id: "f1", factor_type: "totp", status: "verified" }]).filter(
            (f) => f.status === "verified",
          ),
          all: options.factors ?? [{ id: "f1", factor_type: "totp", status: "verified" }],
        },
        error: null,
      })),
      challengeAndVerify: vi.fn(async () => ({
        error: options.verifyError
          ? options.verifyError === true
            ? { message: "bad" }
            : options.verifyError
          : null,
      })),
      enroll: vi.fn(async () => ({
        data: { id: "f-new", totp: { qr_code: "<svg/>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://" } },
        error: null,
      })),
      unenroll: vi.fn(async () => ({ data: {}, error: null })),
    },
  };
  const maybeSingle = vi.fn(async () =>
    options.profileError
      ? { data: null, error: { message: "relation does not exist" } }
      : { data: options.role === null ? null : { role: options.role ?? "admin" }, error: null },
  );
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  vi.mocked(createClient).mockResolvedValue({ auth, from } as never);
  return auth;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
const signInForm = (overrides: Record<string, string> = {}) =>
  form({ email: "Admin@LW.test", password: PASSWORD, ...overrides });
const signUpForm = (overrides: Record<string, string> = {}) =>
  form({
    email: "Moi@LW.test",
    username: "nguoi_moi",
    password: PASSWORD,
    confirmPassword: PASSWORD,
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readMfaRequired).mockResolvedValue(true);
  cookieStore.getAll.mockReturnValue([]);
});

describe("server action signIn", () => {
  it("đăng nhập thành công: chuẩn hóa email, sang bước xác thực hai lớp", async () => {
    const auth = fakeSupabase({ role: "admin" });
    await signIn({}, signInForm());
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "admin@lw.test", password: PASSWORD });
    expect(redirect).toHaveBeenCalledWith("/login/mfa");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("công tắc 2 lớp tắt: vào thẳng trang muốn vào trước đó", async () => {
    vi.mocked(readMfaRequired).mockResolvedValue(false);
    fakeSupabase({ role: "editor" });
    await signIn({}, signInForm({ next: "/players?tab=staff" }));
    expect(redirect).toHaveBeenCalledWith("/players?tab=staff");
  });

  it("giữ trang đích qua bước xác thực hai lớp", async () => {
    fakeSupabase({ role: "admin" });
    await signIn({}, signInForm({ next: "/lands" }));
    expect(redirect).toHaveBeenCalledWith("/login/mfa?next=%2Flands");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "javascript:alert(1)"])(
    "chặn open redirect: next=%s → về Tổng quan",
    async (next) => {
      vi.mocked(readMfaRequired).mockResolvedValue(false);
      fakeSupabase({ role: "admin" });
      await signIn({}, signInForm({ next }));
      expect(redirect).toHaveBeenCalledWith("/");
    },
  );

  it("sai email hoặc mật khẩu: một thông báo chung, trả lại email, không trả lại mật khẩu", async () => {
    fakeSupabase({ signInError: { code: "invalid_credentials", status: 400 } });
    const result = await signIn({}, signInForm());
    expect(result).toEqual({ values: { email: "Admin@LW.test" }, error: "Email hoặc mật khẩu không đúng" });
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("form sai thì báo lỗi theo từng ô và không gọi Supabase", async () => {
    const auth = fakeSupabase();
    const result = await signIn({}, signInForm({ email: "khong-phai-email", password: "" }));
    expect(result.fieldErrors).toEqual({ email: "Email không đúng định dạng", password: "Nhập mật khẩu" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("mất kết nối tới Supabase", async () => {
    fakeSupabase({ signInThrows: true });
    expect((await signIn({}, signInForm())).error).toBe(
      "Không kết nối được máy chủ xác thực. Kiểm tra mạng rồi thử lại.",
    );
  });

  it("người chơi bị chặn và bị đăng xuất ngay", async () => {
    const auth = fakeSupabase({ role: "player" });
    const result = await signIn({}, signInForm());
    expect(result.error).toContain("chưa được cấp quyền quản trị");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("chưa có hồ sơ hoặc vai trò lạ cũng bị chặn", async () => {
    for (const role of [null, "superuser"]) {
      const auth = fakeSupabase({ role });
      expect((await signIn({}, signInForm())).error).toContain("chưa được cấp quyền");
      expect(auth.signOut).toHaveBeenCalled();
    }
  });
});

describe("thông báo lỗi đăng nhập", () => {
  it.each([
    [{ code: "invalid_credentials", status: 400 }, "Email hoặc mật khẩu không đúng"],
    [{ code: "email_not_confirmed", status: 400 }, "Email chưa được xác nhận"],
    [{ code: "user_banned", status: 400 }, "Tài khoản đã bị khóa"],
    [{ code: "over_request_rate_limit", status: 429 }, "quá nhiều lần"],
    [{ status: 503 }, "đang gặp sự cố"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "Không kết nối được"],
    [{ code: "user_not_found", status: 400 }, "Email hoặc mật khẩu không đúng"],
  ])("%j", (error, message) => {
    expect(signInErrorMessage(error)).toContain(message);
  });
});

describe("server action signUp", () => {
  it.each([
    [{ email: "khong-phai-email" }, "email", "Email không đúng định dạng"],
    [{ email: "" }, "email", "Nhập email"],
    [{ username: "ab" }, "username", USERNAME_RULE],
    [{ username: "KhongDacBiet" }, "username", USERNAME_RULE],
    [{ password: "ngan1", confirmPassword: "ngan1" }, "password", "Mật khẩu tối thiểu 8 ký tự"],
    [{ password: "chicochu", confirmPassword: "chicochu" }, "password", "Mật khẩu cần có cả chữ và số"],
    [{ password: "12345678", confirmPassword: "12345678" }, "password", "Mật khẩu cần có cả chữ và số"],
    [{ password: `a1${"x".repeat(71)}` }, "password", "Mật khẩu tối đa 72 ký tự"],
    [{ confirmPassword: "khac-hoan-toan-1" }, "confirmPassword", "Mật khẩu nhập lại không khớp"],
  ])("kiểm tra dữ liệu %j trước khi gọi Supabase", async (overrides, field, message) => {
    const auth = fakeSupabase();
    const result = await signUp({}, signUpForm(overrides));
    expect(result.fieldErrors?.[field]).toBe(message);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("trình duyệt và máy chủ dùng cùng một schema", () => {
    const result = parseForm(SignUpInput, signUpForm({ email: "x" }), SIGN_UP_FIELDS);
    expect(result.success).toBe(false);
  });

  it("có lỗi thì trả lại email và tên đã nhập để điền lại form, KHÔNG trả lại mật khẩu", async () => {
    fakeSupabase();
    const result = await signUp({}, signUpForm({ confirmPassword: "khac-hoan-toan-1" }));
    expect(result.values).toEqual({ email: "Moi@LW.test", username: "nguoi_moi" });
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
  });

  it("chỉ gửi username trong metadata, không bao giờ gửi vai trò", async () => {
    const auth = fakeSupabase();
    await signUp({}, signUpForm({ role: "admin" }));
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "moi@lw.test",
      password: PASSWORD,
      options: { data: { username: "nguoi_moi" }, emailRedirectTo: "http://localhost:3001/auth/callback" },
    });
  });

  it("dự án bật xác nhận email: báo kiểm tra email", async () => {
    const auth = fakeSupabase({ signUpSession: null });
    const result = await signUp({}, signUpForm());
    expect(result.message).toContain("Đã gửi email xác nhận tới moi@lw.test");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("dự án tắt xác nhận email: đăng xuất ngay vì tài khoản mới chưa có quyền", async () => {
    const auth = fakeSupabase({ signUpSession: { access_token: "x" } });
    const result = await signUp({}, signUpForm());
    expect(result.message).toContain("báo admin cấp quyền");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("đổi mã lỗi của Supabase thành thông báo tiếng Việt", async () => {
    fakeSupabase({ signUpErrorCode: "user_already_exists" });
    expect(await signUp({}, signUpForm())).toMatchObject({
      error: "Email này đã có tài khoản, hãy đăng nhập",
    });
  });
});

describe("server action signOut", () => {
  it("đăng xuất phiên này rồi về trang đăng nhập", async () => {
    const auth = fakeSupabase();
    await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(cookieStore.delete).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login?signed_out=1");
  });

  it("Supabase lỗi: vẫn xóa cookie phiên của trang quản trị (không đụng cookie khác)", async () => {
    fakeSupabase({ signOutError: true });
    cookieStore.getAll.mockReturnValue([
      { name: "lw-admin-auth.0" },
      { name: "lw-admin-auth.1" },
      { name: "lw-game-auth" },
      { name: "lw-admin-sidebar" },
    ]);
    await signOut();
    expect(cookieStore.delete.mock.calls.map(([name]) => name)).toEqual([
      "lw-admin-auth.0",
      "lw-admin-auth.1",
    ]);
    expect(redirect).toHaveBeenCalledWith("/login?signed_out=partial");
  });
});

describe("thông báo lỗi mã TOTP", () => {
  it.each([
    [{ code: "mfa_verification_failed", status: 422 }, "Mã không đúng"],
    [{ code: "mfa_challenge_expired", status: 422 }, "Mã đã hết hạn"],
    [{ code: "mfa_factor_not_found", status: 404 }, "thiết lập lại"],
    [{ code: "mfa_verification_rejected", status: 422 }, "quá nhiều lần"],
    [{ code: "over_request_rate_limit", status: 429 }, "quá nhiều lần"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "Không kết nối được"],
    [{ status: 503 }, "đang gặp sự cố"],
    [{ code: "la_lam", status: 400 }, "Mã không đúng hoặc đã hết hạn"],
  ])("%j", (error, message) => {
    expect(totpErrorMessage(error)).toContain(message);
  });
});

describe("thiết lập TOTP", () => {
  const staff = { userId: "u1", email: "a@lw.test", role: "admin", aal: "aal1", mfaRequired: false } as const;

  it("tạo QR với tên ứng dụng 'Language World Admin', dọn khóa dang dở trước", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    const auth = fakeSupabase({ factors: [{ id: "old", factor_type: "totp", status: "unverified" }] });
    const result = await startTotpEnroll();
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "old" });
    expect(auth.mfa.enroll).toHaveBeenCalledWith(
      expect.objectContaining({ factorType: "totp", issuer: "Language World Admin" }),
    );
    expect(result).toMatchObject({ factorId: "f-new", secret: "JBSWY3DPEHPK3PXP" });
    expect((result as { qrCode: string }).qrCode).toMatch(/^data:image\/svg\+xml/);
  });

  it("đã có khóa đã xác minh thì không tạo thêm", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    const auth = fakeSupabase();
    expect(await startTotpEnroll()).toEqual({ error: "Tài khoản đã thiết lập xác thực hai lớp" });
    expect(auth.mfa.enroll).not.toHaveBeenCalled();
  });

  it("người chơi / chưa đăng nhập không tạo được", async () => {
    for (const session of [null, { ...staff, role: "player" as const }]) {
      vi.mocked(getSession).mockResolvedValue(session);
      const auth = fakeSupabase({ factors: [] });
      expect(await startTotpEnroll()).toHaveProperty("error");
      expect(auth.mfa.enroll).not.toHaveBeenCalled();
    }
  });

  it("hủy thiết lập: chỉ xóa khóa CHƯA xác minh của chính mình", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    let auth = fakeSupabase({ factors: [{ id: "dang-do", factor_type: "totp", status: "unverified" }] });
    expect(await cancelTotpEnroll("dang-do")).toEqual({ ok: true });
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "dang-do" });
    auth = fakeSupabase();
    expect(await cancelTotpEnroll("f1")).toEqual({ ok: false });
    expect(await cancelTotpEnroll("cua-nguoi-khac")).toEqual({ ok: false });
    expect(auth.mfa.unenroll).not.toHaveBeenCalled();
  });
});

describe("server action verifyTotp", () => {
  const staff = { userId: "u1", email: "a@lw.test", role: "admin", aal: "aal1", mfaRequired: true } as const;

  it("mã đúng: vào trang đích an toàn", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    const auth = fakeSupabase();
    await verifyTotp({}, form({ code: "123 456", next: "/words" }));
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "f1", code: "123456" });
    expect(redirect).toHaveBeenCalledWith("/words");
  });

  it("chặn open redirect sau xác thực hai lớp", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    fakeSupabase();
    await verifyTotp({}, form({ code: "123456", next: "https://evil.example" }));
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("mã sai: báo lỗi, không chuyển trang", async () => {
    vi.mocked(getSession).mockResolvedValue(staff);
    fakeSupabase({ verifyError: true });
    expect(await verifyTotp({}, form({ code: "000000" }))).toEqual({
      error: "Mã không đúng hoặc đã hết hạn",
    });
    fakeSupabase({ verifyError: { code: "mfa_challenge_expired", status: 422 } });
    expect((await verifyTotp({}, form({ code: "000000" }))).error).toContain("Mã đã hết hạn");
    fakeSupabase({ verifyError: { code: "mfa_verification_failed", status: 422 } });
    expect((await verifyTotp({}, form({ code: "000000" }))).error).toContain("Mã không đúng.");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("người chơi hoặc phiên đã hết hạn không xác thực được", async () => {
    for (const session of [null, { ...staff, role: "player" as const }]) {
      vi.mocked(getSession).mockResolvedValue(session);
      const auth = fakeSupabase();
      expect((await verifyTotp({}, form({ code: "123456" }))).error).toBeTruthy();
      expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
    }
  });
});
