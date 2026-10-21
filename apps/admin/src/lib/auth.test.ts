import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SECTIONS, STAFF_ROLES, activeSectionTab, sectionsForRole, type Role } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";
import { fakeSupabase, type FakeUser } from "@/test/fake-supabase";
import { logAction } from "./audit";
import { AuthError, requirePermission, requireRole, requireSection } from "./auth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const cookieJar = vi.hoisted(() => ({ names: [] as string[] }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => cookieJar.names.map((name) => ({ name, value: "x" })) }),
}));
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
  cookieJar.names = [];
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

  it("JWT đúng chữ ký nhưng phiên đã bị thu hồi / tài khoản bị khóa: coi như chưa đăng nhập", async () => {
    loginAs({ role: "admin", account: "revoked" });
    expect(await authErrorCode(requireRole(["admin"]))).toBe("unauthenticated");
  });

  it("token của người khác (id không khớp) bị từ chối", async () => {
    const fake = loginAs({ role: "admin" });
    fake.client.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "nguoi-khac" } },
      error: null,
    } as never);
    expect(await authErrorCode(requireRole(["admin"]))).toBe("unauthenticated");
  });

  it("mất kết nối tới Supabase Auth: báo 'unavailable', không coi là đăng xuất", async () => {
    loginAs({ role: "admin", account: "offline" });
    expect(await authErrorCode(requireRole(["admin"]))).toBe("unavailable");
  });

  it("vai trò lạ trong database cũng bị chặn", async () => {
    loginAs({ role: "superadmin" });
    expect(await authErrorCode(requireRole(STAFF_ROLES))).toBe("forbidden");
  });
});

describe("requirePermission (xác thực bổ sung AAL2)", () => {
  it.each(["staff.manage", "players.manage", "content.delete"] as const)(
    "%s: công tắc 2 lớp tắt, admin aal1 vẫn bị yêu cầu xác thực hai lớp",
    async (permission) => {
      loginAs({ role: "admin", aal: "aal1", mfaRequired: false });
      expect(await authErrorCode(requirePermission(permission))).toBe("step_up_required");
    },
  );

  it("thao tác thường không cần xác thực bổ sung khi công tắc tắt", async () => {
    loginAs({ role: "editor", aal: "aal1", mfaRequired: false });
    await expect(requirePermission("content.update")).resolves.toMatchObject({ role: "editor" });
  });

  it("phiên AAL2 làm được thao tác nhạy cảm; sai vai trò vẫn bị chặn trước", async () => {
    loginAs({ role: "admin", aal: "aal2" });
    await expect(requirePermission("staff.manage")).resolves.toMatchObject({ role: "admin" });
    loginAs({ role: "editor", aal: "aal2" });
    expect(await authErrorCode(requirePermission("content.delete"))).toBe("forbidden");
  });

  it("công tắc bật: aal1 bị chặn ngay ở bước đăng nhập (mfa_required)", async () => {
    loginAs({ role: "admin", aal: "aal1", mfaRequired: true });
    expect(await authErrorCode(requirePermission("staff.manage"))).toBe("mfa_required");
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

  it("còn cookie phiên mà phiên bị từ chối: về đăng nhập kèm thông báo hết hạn", async () => {
    cookieJar.names = ["lw-admin-auth.0", "lw-admin-sidebar"];
    loginAs({ role: "admin", account: "revoked" });
    await expect(requireSection("players")).rejects.toThrow("REDIRECT /login?expired=1");
  });

  it("mất kết nối: không chuyển về đăng nhập (giữ phiên), báo lỗi để thử lại", async () => {
    loginAs({ role: "admin", account: "offline" });
    const error = await requireSection("players").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe("unavailable");
  });
});

describe("bảng phân quyền menu", () => {
  it.each<[Role, string[]]>([
    ["admin", ["/", "/lands", "/words", "/lessons", "/media", "/economy", "/players", "/logs", "/settings"]],
    ["editor", ["/", "/lands", "/words", "/lessons", "/media"]],
    ["moderator", ["/", "/players"]],
    ["player", []],
  ])("%s thấy đúng các trang", (role, hrefs) => {
    expect(sectionsForRole(role).map((section) => section.href)).toEqual(hrefs);
  });

  it("thanh bên: 8 mục chính đúng thứ tự (+ Cài đặt bảo mật), chia nhóm Nội dung học · Kinh tế · Vận hành", () => {
    expect(sectionsForRole("admin").map((section) => [section.label, section.group])).toEqual([
      ["Tổng quan", null],
      ["Vùng đất và khu vực", "content"],
      ["Kho từ vựng", "content"],
      ["Bài học", "content"],
      ["Media", "content"],
      ["Vật phẩm và kinh tế", "economy"],
      ["Người chơi và báo cáo", "operations"],
      ["Nhật ký", "operations"],
      ["Cài đặt bảo mật", "operations"],
    ]);
  });
});

describe("tab của mục chính (?tab=)", () => {
  it("mỗi mục có đúng các tab theo thiết kế", () => {
    expect(
      Object.fromEntries(Object.values(ADMIN_SECTIONS).map((s) => [s.href, s.tabs.map((t) => t.label)])),
    ).toEqual({
      "/": [
        "Người chơi mới và đang hoạt động",
        "Bài học hoàn thành",
        "Từ hay sai nhiều",
        "Vàng đang lưu hành",
      ],
      "/lands": ["Vùng đất (ngôn ngữ)", "Khu vực (kỹ năng)", "Bật/tắt và thứ tự mở khóa"],
      "/words": ["Danh sách và bộ lọc", "Nhập CSV", "Lỗi khi nhập"],
      "/lessons": ["Danh sách bài học", "Câu hỏi theo kỹ năng", "Nháp và xuất bản"],
      "/media": ["Mô hình 3D", "Hình ảnh", "Âm thanh"],
      "/economy": ["Giá mua/bán", "Thời gian cây lớn", "Phần thưởng", "Lịch sử thay đổi và hoàn tác"],
      "/players": ["Tiến độ người chơi", "Báo cáo và khóa chat", "Khóa tài khoản", "Tặng vàng"],
      "/logs": ["Toàn bộ thao tác"],
      "/settings": [],
    });
  });

  it("?tab đúng thì mở tab đó; sai / thiếu thì tab có chức năng đầu tiên, không có thì tab đầu", () => {
    expect(activeSectionTab(ADMIN_SECTIONS.words, "import")?.key).toBe("import");
    expect(activeSectionTab(ADMIN_SECTIONS.words, undefined)?.key).toBe("list");
    expect(activeSectionTab(ADMIN_SECTIONS.words, "khong-co")?.key).toBe("list");
    expect(activeSectionTab(ADMIN_SECTIONS.players, undefined)?.key).toBe("accounts");
    expect(activeSectionTab(ADMIN_SECTIONS.media, undefined)?.key).toBe("images");
    expect(activeSectionTab(ADMIN_SECTIONS.lands, ["skills", "x"])?.key).toBe("skills");
    expect(activeSectionTab(ADMIN_SECTIONS.settings, "x")).toBeNull();
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
