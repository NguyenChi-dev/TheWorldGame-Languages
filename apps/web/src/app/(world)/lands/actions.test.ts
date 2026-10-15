import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chooseLand } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const fetchMock = vi.fn();
const LAND = "a1111111-1111-4111-8111-111111111111";

function signedIn(session: object | null = { access_token: "tok-1" }) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getSession: async () => ({ data: { session } }) },
  } as never);
}

function form(landId: string) {
  const data = new FormData();
  data.set("landId", landId);
  return data;
}

const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  signedIn();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chọn vùng đất", () => {
  it("thành công: PATCH /me { landId } kèm token, rồi vào game", async () => {
    reply(200, { landId: LAND });
    await chooseLand({}, form(LAND));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok-1" },
      body: JSON.stringify({ landId: LAND }),
      cache: "no-store",
    });
    expect(redirect).toHaveBeenCalledWith("/play");
  });

  it("chưa chọn / id lạ: báo lỗi, không gọi API", async () => {
    for (const id of ["", "tieng-anh"]) {
      expect((await chooseLand({}, form(id))).error).toBe("Hãy chọn một vùng đất");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("vùng đất vừa bị tắt: hiện thông báo của API, không vào game", async () => {
    reply(404, { error: "Vùng đất không tồn tại hoặc đang đóng" });
    const state = await chooseLand({}, form(LAND));
    expect(state).toEqual({ values: { landId: LAND }, error: "Vùng đất không tồn tại hoặc đang đóng" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("phiên hết hạn (API trả 401) hoặc chưa đăng nhập: về trang đăng nhập", async () => {
    reply(401, { error: "Phiên đăng nhập không hợp lệ" });
    await chooseLand({}, form(LAND));
    expect(redirect).toHaveBeenCalledWith("/login");

    vi.mocked(redirect).mockClear();
    fetchMock.mockClear();
    signedIn(null);
    await chooseLand({}, form(LAND));
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
