import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { fakeSupabase, type FakeUser } from "@/test/fake-supabase";
import { changeUserRole } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const TARGET = "22222222-2222-4222-8222-222222222222";

function loginAs(user: FakeUser) {
  const fake = fakeSupabase(user);
  vi.mocked(createClient).mockResolvedValue(fake.client as never);
  return fake;
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validForm = () => form({ userId: TARGET, role: "editor", reason: "Thử" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("server action changeUserRole", () => {
  it.each<FakeUser>([
    { role: "editor" },
    { role: "moderator" },
    { role: "player" },
    { role: "admin", aal: "aal1" },
  ])("từ chối %j và không đụng tới database", async (user) => {
    const fake = loginAs(user);
    const result = await changeUserRole({}, validForm());
    expect(result.error).toBeTruthy();
    expect(fake.update).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("admin đổi được và có ghi nhật ký", async () => {
    const fake = loginAs({ role: "admin" });
    const result = await changeUserRole({}, validForm());
    expect(result).toEqual({ message: "Đã đổi vai trò thành editor" });
    expect(fake.update).toHaveBeenCalledWith({ role: "editor" });
    expect(fake.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "profiles.update_role", target_id: TARGET, actor_role: "admin" }),
    );
  });

  it("admin không tự đổi vai trò của mình", async () => {
    const fake = loginAs({ id: TARGET, role: "admin" });
    const result = await changeUserRole({}, validForm());
    expect(result.error).toBe("Không được tự đổi vai trò của mình");
    expect(fake.update).not.toHaveBeenCalled();
  });
});
