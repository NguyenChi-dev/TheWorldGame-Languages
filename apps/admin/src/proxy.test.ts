import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "./proxy";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

function signedIn(claims: object | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getClaims: vi.fn(async () => ({ data: claims ? { claims } : null, error: null })) },
  } as never);
}
const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3001${path}`, cookie ? { headers: { cookie } } : undefined);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("proxy: chặn trang quản trị khi chưa đăng nhập", () => {
  it("chưa đăng nhập: về /login, ghi nhớ trang muốn vào", async () => {
    signedIn(null);
    const response = await proxy(request("/players?tab=staff"));
    const location = new URL(response.headers.get("location")!);
    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/players?tab=staff");
    expect(location.searchParams.has("expired")).toBe(false);
  });

  it("trang Tổng quan: không cần ?next", async () => {
    signedIn(null);
    const location = new URL((await proxy(request("/"))).headers.get("location")!);
    expect(location.search).toBe("");
  });

  it("còn cookie phiên nhưng phiên đã hết hạn: báo hết hạn", async () => {
    signedIn(null);
    const response = await proxy(request("/words", "lw-admin-auth=expired-token"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("expired")).toBe("1");
    expect(location.searchParams.get("next")).toBe("/words");
  });

  it("cookie của game không bị coi là phiên quản trị", async () => {
    signedIn(null);
    const location = new URL((await proxy(request("/words", "lw-game-auth=x"))).headers.get("location")!);
    expect(location.searchParams.has("expired")).toBe(false);
  });

  it("trang đăng nhập / đăng ký mở được khi chưa đăng nhập", async () => {
    signedIn(null);
    for (const path of ["/login", "/signup", "/login/mfa", "/auth/callback"])
      expect((await proxy(request(path))).headers.get("location")).toBeNull();
  });

  it("đã đăng nhập: cho qua (vai trò và 2 lớp do requireSection kiểm tra ở máy chủ)", async () => {
    signedIn({ sub: "u1", role: "authenticated" });
    expect((await proxy(request("/players"))).headers.get("location")).toBeNull();
  });
});
