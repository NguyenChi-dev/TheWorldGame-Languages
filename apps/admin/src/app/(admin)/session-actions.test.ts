import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { fakeSupabase, type FakeUser } from "@/test/fake-supabase";
import { checkSession } from "./session-actions";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const as = (user: FakeUser | null) =>
  vi.mocked(createClient).mockResolvedValue(fakeSupabase(user).client as never);

beforeEach(() => vi.clearAllMocks());

describe("checkSession (trình duyệt hỏi định kỳ / khi đổi tab)", () => {
  it("nhân viên hợp lệ: ok kèm id, không trả token", async () => {
    as({ id: "u-1", role: "editor" });
    expect(await checkSession()).toEqual({ state: "ok", userId: "u-1" });
  });
  it.each<[FakeUser | null, string]>([
    [null, "signed_out"],
    [{ role: "admin", account: "revoked" }, "signed_out"],
    [{ role: "player" }, "forbidden"],
    [{ role: "admin", aal: "aal1" }, "mfa_required"],
    [{ role: "admin", account: "offline" }, "unavailable"],
  ])("%j → %s", async (user, state) => {
    as(user);
    expect(await checkSession()).toEqual({ state });
  });
});
