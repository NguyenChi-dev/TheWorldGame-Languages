import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setRequireMfa } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requirePermission: vi.fn(),
}));

function rpcReturns(error: { code: string; message: string } | null) {
  const rpc = vi.fn(async () => ({ data: error ? null : true, error }));
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue({} as never);
});

describe("setRequireMfa (công tắc bắt buộc 2 lớp)", () => {
  it("admin AAL2: gọi hàm database set_admin_mfa_required (hàm tự ghi nhật ký)", async () => {
    const rpc = rpcReturns(null);
    expect(await setRequireMfa(true)).toMatchObject({ ok: true });
    expect(requirePermission).toHaveBeenCalledWith("settings.manage");
    expect(rpc).toHaveBeenCalledWith("set_admin_mfa_required", { p_required: true });
  });

  it("chưa AAL2 / không phải admin: từ chối, không gọi database", async () => {
    const rpc = rpcReturns(null);
    vi.mocked(requirePermission).mockRejectedValue(new AuthError("step_up_required"));
    expect(await setRequireMfa(false)).toMatchObject({
      ok: false,
      error: expect.stringContaining("xác thực hai lớp"),
    });
    vi.mocked(requirePermission).mockRejectedValue(new AuthError("forbidden"));
    expect(await setRequireMfa(false)).toEqual({ ok: false, error: "Bạn không có quyền làm việc này" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("database chưa có migration 0009 / database từ chối", async () => {
    rpcReturns({ code: "PGRST202", message: "not found" });
    expect((await setRequireMfa(true)).ok === false && (await setRequireMfa(true))).toMatchObject({
      error: expect.stringContaining("migration 0009"),
    });
    rpcReturns({ code: "42501", message: "denied" });
    expect(await setRequireMfa(true)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Chỉ admin"),
    });
  });

  it("giá trị không phải boolean bị từ chối", async () => {
    expect(await setRequireMfa("true" as never)).toEqual({ ok: false, error: "Giá trị không hợp lệ" });
  });
});
