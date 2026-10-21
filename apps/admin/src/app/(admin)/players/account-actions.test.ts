import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { ApiCallError, apiRequest } from "@/lib/api";
import { AuthError, requireRole } from "@/lib/auth";
import {
  banPlayer,
  confirmPlayerEmail,
  deletePlayer,
  renamePlayer,
  resetStaffMfa,
  sendPlayerPasswordReset,
  unbanPlayer,
} from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => {
  const { rolesFor } = await import("@lw/shared");
  const requireRole = vi.fn();
  return {
    ...(await importOriginal<typeof import("@/lib/auth")>()),
    requireRole,
    // Cùng vai trò như requireRole thật; bước AAL2 của requirePermission có test riêng ở lib/auth.test.ts.
    requirePermission: vi.fn((permission: Parameters<typeof rolesFor>[0]) =>
      requireRole(rolesFor(permission)),
    ),
  };
});
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiRequest: vi.fn(),
}));

const ID = "b0000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({} as never);
  vi.mocked(apiRequest).mockResolvedValue({ message: "Xong", player: null });
});

describe("thao tác tài khoản người chơi (gọi apps/api)", () => {
  it.each([
    [
      "confirmPlayerEmail",
      () => confirmPlayerEmail(ID),
      `/admin/players/${ID}/confirm-email`,
      "POST",
      undefined,
    ],
    [
      "sendPlayerPasswordReset",
      () => sendPlayerPasswordReset(ID),
      `/admin/players/${ID}/password-reset`,
      "POST",
      undefined,
    ],
    [
      "banPlayer",
      () => banPlayer(ID, { reason: "Spam", days: 7 }),
      `/admin/players/${ID}/ban`,
      "POST",
      { reason: "Spam", days: 7 },
    ],
    [
      "unbanPlayer",
      () => unbanPlayer(ID, { reason: "Ok" }),
      `/admin/players/${ID}/unban`,
      "POST",
      { reason: "Ok" },
    ],
    [
      "renamePlayer",
      () => renamePlayer(ID, { username: "Mèo" }),
      `/admin/players/${ID}`,
      "PATCH",
      { username: "Mèo" },
    ],
    [
      "resetStaffMfa",
      () => resetStaffMfa(ID, { reason: "Mất điện thoại" }),
      `/admin/players/${ID}/mfa-reset`,
      "POST",
      { reason: "Mất điện thoại" },
    ],
    [
      "deletePlayer",
      () => deletePlayer(ID, { reason: "Rác" }),
      `/admin/players/${ID}`,
      "DELETE",
      { reason: "Rác" },
    ],
  ])("%s: gọi đúng route, làm mới trang", async (_name, call, path, method, body) => {
    expect(await call()).toEqual({ ok: true, message: "Xong" });
    expect(requireRole).toHaveBeenCalledWith(["admin"]);
    expect(apiRequest).toHaveBeenCalledWith(path, { method, body });
    expect(revalidatePath).toHaveBeenCalledWith("/players");
  });

  it("không phải admin: từ chối, không gọi API", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("forbidden"));
    expect(await confirmPlayerEmail(ID)).toEqual({ ok: false, error: "Bạn không có quyền làm việc này" });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("mã người chơi sai: không gọi API", async () => {
    expect(await deletePlayer("khong-hop-le", { reason: "x" })).toEqual({
      ok: false,
      error: "Mã người chơi không hợp lệ",
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("API báo lỗi: chuyển nguyên thông báo tiếng Việt, không làm mới trang", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiCallError(409, "Tên nhân vật này đã có người dùng"));
    expect(await renamePlayer(ID, { username: "Trùng" })).toEqual({
      ok: false,
      error: "Tên nhân vật này đã có người dùng",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
