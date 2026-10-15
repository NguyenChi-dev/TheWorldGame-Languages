import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { USERNAME_RULE } from "@lw/shared";
import { createClient } from "@/lib/supabase/server";
import { chooseCharacter } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const fetchMock = vi.fn();
const look = { gender: "male", hat: "kanzashi", top: "guard", bottom: "chima" };

function signedIn(session: object | null = { access_token: "tok-1" }) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getSession: async () => ({ data: { session } }) },
  } as never);
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
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

describe("chọn nhân vật", () => {
  it("thành công: PATCH /me kèm token, ngoại hình tự phối, tên chuẩn hóa NFC, rồi sang chọn vùng đất", async () => {
    reply(200, { username: "Mèo_Ú", appearance: look });
    await chooseCharacter({}, form({ ...look, username: "  Mèo_Ú " }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok-1" },
      body: JSON.stringify({ username: "Mèo_Ú", appearance: look }),
      cache: "no-store",
    });
    expect(redirect).toHaveBeenCalledWith("/lands");
  });

  it.each([
    [{ ...look, hat: "rong" }],
    [{ ...look, gender: "" }],
    [{ gender: "male", hat: "none", top: "aodai" }],
  ])("ngoại hình không hợp lệ %j: báo lỗi, không gọi API", async (fields) => {
    const state = await chooseCharacter({}, form({ ...fields, username: "Mèo_Ú" }));
    expect(state.error).toBe("Hãy chọn nhân vật và trang phục");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tên sai quy tắc: báo lỗi, giữ lại giá trị đã nhập", async () => {
    const state = await chooseCharacter({}, form({ ...look, username: "KhongDacBiet" }));
    expect(state).toEqual({ values: { ...look, username: "KhongDacBiet" }, error: USERNAME_RULE });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API báo trùng tên: hiện nguyên thông báo", async () => {
    reply(409, { error: "Tên nhân vật này đã có người dùng" });
    const state = await chooseCharacter({}, form({ ...look, username: "Trùng_Tên" }));
    expect(state.error).toBe("Tên nhân vật này đã có người dùng");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("không kết nối được API: báo lỗi dễ hiểu", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const state = await chooseCharacter({}, form({ ...look, username: "Mèo_Ú" }));
    expect(state.error).toBe("Không kết nối được máy chủ, thử lại sau");
  });

  it("chưa đăng nhập: về trang đăng nhập", async () => {
    signedIn(null);
    await chooseCharacter({}, form({ ...look, username: "Mèo_Ú" }));
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
