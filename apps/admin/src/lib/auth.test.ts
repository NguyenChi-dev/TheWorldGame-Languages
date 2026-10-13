import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES, sectionsForRole, type Role } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";
import { fakeSupabase, type FakeUser } from "@/test/fake-supabase";
import { logAction } from "./audit";
import { AuthError, requireRole, requireSection } from "./auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

function loginAs(user: FakeUser | null) {
  const fake = fakeSupabase(user);
  vi.mocked(createClient).mockResolvedValue(fake.client as never);
  return fake;
}

async function authErrorCode(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AuthError);
  return (error as AuthError).code;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireRole", () => {
  it("cho qua khi đúng vai trò và đã xác thực hai lớp", async () => {
    loginAs({ role: "editor", email: "editor@lw.test" });
    await expect(requireRole(["admin", "editor"])).resolves.toMatchObject({
      role: "editor",
      email: "editor@lw.test",
      aal: "aal2",
    });
  });

  it("chưa đăng nhập thì ném lỗi unauthenticated", async () => {
    loginAs(null);
    expect(await authErrorCode(requireRole(STAFF_ROLES))).toBe("unauthenticated");
  });

  it.each<[Role, Role[]]>([
    ["editor", ["admin"]],
    ["moderator", ["admin", "editor"]],
    ["admin", ["moderator"]],
  ])("vai trò %s gọi chỗ chỉ dành cho %j thì ném lỗi forbidden", async (role, allowed) => {
    loginAs({ role });
    expect(await authErrorCode(requireRole(allowed))).toBe("forbidden");
  });

  it("người chơi luôn bị chặn, kể cả khi danh sách có 'player'", async () => {
    loginAs({ role: "player" });
    expect(await authErrorCode(requireRole(["player", "admin"]))).toBe("forbidden");
  });

  it("chưa có hồ sơ thì coi là người chơi", async () => {
    loginAs({ role: null });
    expect(await authErrorCode(requireRole(STAFF_ROLES))).toBe("forbidden");
  });

  it("đúng vai trò nhưng chỉ mới nhập mật khẩu (aal1) thì ném lỗi mfa_required", async () => {
    loginAs({ role: "admin", aal: "aal1" });
    expect(await authErrorCode(requireRole(["admin"]))).toBe("mfa_required");
  });

  it("công tắc 2 lớp đang tắt: admin mới nhập mật khẩu (aal1) vẫn qua", async () => {
    loginAs({ role: "admin", aal: "aal1", mfaRequired: false });
    await expect(requireRole(["admin"])).resolves.toMatchObject({ role: "admin", aal: "aal1" });
  });

  it("công tắc 2 lớp đang tắt vẫn chặn sai vai trò và người chơi", async () => {
    loginAs({ role: "editor", aal: "aal1", mfaRequired: false });
    expect(await authErrorCode(requireRole(["admin"]))).toBe("forbidden");
    loginAs({ role: "player", aal: "aal1", mfaRequired: false });
    expect(await authErrorCode(requireRole(STAFF_ROLES))).toBe("forbidden");
  });

  it("không đọc được công tắc (ví dụ chưa chạy migration) thì vẫn bắt buộc 2 lớp", async () => {
    const fake = loginAs({ role: "admin", aal: "aal1", mfaRequired: false });
    fake.client.rpc.mockResolvedValueOnce({ data: null, error: { message: "function not found" } } as never);
    expect(await authErrorCode(requireRole(["admin"]))).toBe("mfa_required");
  });

  it("vai trò lạ trong database cũng bị chặn", async () => {
    loginAs({ role: "superadmin" });
    expect(await authErrorCode(requireRole(STAFF_ROLES))).toBe("forbidden");
  });
});

describe("requireSection", () => {
  it("chuyển hướng đúng nơi theo lý do bị chặn", async () => {
    loginAs(null);
    await expect(requireSection("logs")).rejects.toThrow("REDIRECT /login");

    loginAs({ role: "admin", aal: "aal1" });
    await expect(requireSection("logs")).rejects.toThrow("REDIRECT /login/mfa");

    loginAs({ role: "editor" });
    await expect(requireSection("logs")).rejects.toThrow("REDIRECT /?denied=1");

    loginAs({ role: "player" });
    await expect(requireSection("overview")).rejects.toThrow("REDIRECT /login?denied=1");
  });
});

describe("bảng phân quyền menu", () => {
  it.each<[Role, string[]]>([
    ["admin", ["/", "/lands", "/words", "/lessons", "/media", "/economy", "/players", "/logs"]],
    ["editor", ["/", "/lands", "/words", "/lessons", "/media"]],
    ["moderator", ["/", "/players"]],
    ["player", []],
  ])("%s thấy đúng các trang", (role, hrefs) => {
    expect(sectionsForRole(role).map((section) => section.href)).toEqual(hrefs);
  });
});

describe("logAction", () => {
  it("ghi nhật ký với người thực hiện và vai trò lấy từ phiên, không lấy từ tham số", async () => {
    const fake = loginAs({ id: "11111111-1111-4111-8111-111111111111", role: "moderator" });
    await logAction({ action: "profiles.ban", targetTable: "profiles", targetId: "x", reason: "  spam  " });
    expect(fake.client.from).toHaveBeenLastCalledWith("admin_logs");
    expect(fake.insert).toHaveBeenCalledWith({
      actor_id: "11111111-1111-4111-8111-111111111111",
      actor_role: "moderator",
      action: "profiles.ban",
      target_table: "profiles",
      target_id: "x",
      before: null,
      after: null,
      reason: "spam",
    });
  });

  it("người chơi không ghi được", async () => {
    const fake = loginAs({ role: "player" });
    await expect(logAction({ action: "x", targetTable: "y" })).rejects.toBeInstanceOf(AuthError);
    expect(fake.insert).not.toHaveBeenCalled();
  });
});
