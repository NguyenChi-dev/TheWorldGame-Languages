import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAction } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createArea,
  createLand,
  deleteLand,
  reorderAreas,
  reorderLands,
  setAreaActive,
  setLandActive,
  updateArea,
  updateLand,
} from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireRole: vi.fn(),
}));

const LAND = "a17d0000-0000-4000-8000-000000000001";
const LAND_2 = "a17d0000-0000-4000-8000-000000000002";
const AREA = "a5ea0000-0000-4000-8000-000000000001";
const AREA_2 = "a5ea0000-0000-4000-8000-000000000002";

type Result = { data?: unknown; error?: unknown; count?: number };

/**
 * Supabase giả: mỗi lệnh kết thúc (await / single / maybeSingle / rpc) lấy kết quả tiếp theo trong
 * `script["bảng.thao_tác"]`, và ghi lại lệnh đã chạy vào `calls`.
 */
function fakeDb(script: Record<string, Result[]>) {
  const calls: { key: string; payload?: unknown }[] = [];
  const next = (key: string, payload?: unknown) => {
    calls.push({ key, payload });
    return script[key]?.shift() ?? { data: null, error: null };
  };
  const from = (table: string) => {
    let op = "select";
    let payload: unknown;
    const run = async () => next(`${table}.${op}`, payload);
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      limit: () => query,
      insert: (value: unknown) => ((op = "insert"), (payload = value), query),
      update: (value: unknown) => ((op = "update"), (payload = value), query),
      delete: () => ((op = "delete"), query),
      single: run,
      maybeSingle: run,
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        run().then(resolve, reject),
    };
    return query;
  };
  const client = {
    from: vi.fn(from),
    rpc: vi.fn(async (name: string, args: unknown) => next(`rpc.${name}`, args)),
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return {
    client,
    calls,
    writes: () => calls.filter((c) => /\.(insert|update|delete)$|^rpc\./.test(c.key)),
  };
}

const validLand = { name: "Tiếng Hàn", slug: "tieng-han", languageCode: "KO", description: "" };
const validArea = {
  name: "Chợ",
  skill: "conversation",
  scene: "market",
  unlockRequirement: { lessons_done: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireRole).mockResolvedValue({} as never);
});

describe("chặn sai vai trò (lớp 2) trước khi đụng database", () => {
  it.each([
    ["createLand", () => createLand(validLand)],
    ["updateLand", () => updateLand(LAND, validLand)],
    ["setLandActive", () => setLandActive(LAND, true)],
    ["reorderLands", () => reorderLands([LAND])],
    ["createArea", () => createArea(LAND, validArea)],
    ["updateArea", () => updateArea(AREA, validArea)],
    ["setAreaActive", () => setAreaActive(AREA, true)],
    ["reorderAreas", () => reorderAreas(LAND, [AREA])],
  ])("%s: moderator/player bị từ chối", async (_name, call) => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("forbidden"));
    await expect(call()).resolves.toEqual({ ok: false, error: "Bạn không có quyền làm việc này" });
    expect(requireRole).toHaveBeenCalledWith(["admin", "editor"]);
    expect(createClient).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });
});

describe("kiểm tra dữ liệu bằng Zod", () => {
  it.each([
    [{ ...validLand, name: "  " }, "Nhập tên vùng đất"],
    [
      { ...validLand, slug: "Tiếng Hàn" },
      "Slug chỉ gồm chữ thường a-z, số 0-9 và dấu gạch ngang (ví dụ tieng-anh)",
    ],
    [{ ...validLand, languageCode: "korean" }, "Mã ngôn ngữ gồm 2–3 chữ cái thường (ví dụ en, ja)"],
  ])("vùng đất sai: %j", async (input, message) => {
    expect(await createLand(input)).toEqual({ ok: false, error: message });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("kỹ năng không có trong danh sách cố định", async () => {
    expect(await createArea(LAND, { ...validArea, skill: "dancing" })).toEqual({
      ok: false,
      error: "Chọn kỹ năng",
    });
  });
});

describe("vùng đất", () => {
  it("tạo mới: đứng cuối danh sách, mã ngôn ngữ chữ thường, ghi đúng 1 dòng nhật ký", async () => {
    const created = { id: LAND_2, name: "Tiếng Hàn", slug: "tieng-han" };
    const db = fakeDb({ "lands.select": [{ data: { sort_order: 4 } }], "lands.insert": [{ data: created }] });
    expect(await createLand(validLand)).toEqual({
      ok: true,
      message: 'Đã tạo vùng đất "Tiếng Hàn" (đang tắt)',
      data: { id: LAND_2 },
    });
    expect(db.writes()).toEqual([
      {
        key: "lands.insert",
        payload: {
          name: "Tiếng Hàn",
          slug: "tieng-han",
          language_code: "ko",
          description: "",
          cover_media_id: null,
          sort_order: 5,
        },
      },
    ]);
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledWith({
      action: "lands.create",
      targetTable: "lands",
      targetId: LAND_2,
      after: created,
    });
  });

  it.each([
    [
      'duplicate key value violates unique constraint "lands_slug_key"',
      "Slug này đã được dùng cho vùng đất khác",
    ],
    [
      'duplicate key value violates unique constraint "lands_language_code_key"',
      "Mã ngôn ngữ này đã có vùng đất khác",
    ],
  ])("lỗi trùng (%s) thành câu tiếng Việt, không ghi nhật ký", async (message, expected) => {
    fakeDb({ "lands.insert": [{ error: { code: "23505", message } }] });
    expect(await createLand(validLand)).toEqual({ ok: false, error: expected });
    expect(logAction).not.toHaveBeenCalled();
  });

  it("sửa: nhật ký có before / after", async () => {
    const before = { id: LAND, name: "Tiếng Anh" };
    const after = { id: LAND, name: "Tiếng Hàn" };
    fakeDb({ "lands.select": [{ data: before }], "lands.update": [{ data: after }] });
    expect((await updateLand(LAND, validLand)).ok).toBe(true);
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledWith({
      action: "lands.update",
      targetTable: "lands",
      targetId: LAND,
      before,
      after,
    });
  });

  it("RLS chặn cập nhật (không dòng nào đổi) thì báo lỗi, không ghi nhật ký", async () => {
    fakeDb({ "lands.select": [{ data: { id: LAND } }], "lands.update": [{ data: null }] });
    expect(await setLandActive(LAND, true)).toEqual({
      ok: false,
      error: "Không đổi được trạng thái vùng đất",
    });
    expect(logAction).not.toHaveBeenCalled();
  });

  it("đổi thứ tự: phải gửi đủ mọi vùng đất", async () => {
    const db = fakeDb({ "lands.select": [{ data: [{ id: LAND }, { id: LAND_2 }] }] });
    expect(await reorderLands([LAND])).toEqual({
      ok: false,
      error: "Danh sách vùng đất đã thay đổi. Tải lại trang rồi thử lại",
    });
    expect(db.client.rpc).not.toHaveBeenCalled();
  });

  it("đổi thứ tự: gọi rpc reorder_lands một lần, ghi 1 dòng nhật ký", async () => {
    const db = fakeDb({ "lands.select": [{ data: [{ id: LAND }, { id: LAND_2 }] }] });
    expect((await reorderLands([LAND_2, LAND])).ok).toBe(true);
    expect(db.writes()).toEqual([{ key: "rpc.reorder_lands", payload: { ids: [LAND_2, LAND] } }]);
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lands.reorder", before: [LAND, LAND_2], after: [LAND_2, LAND] }),
    );
  });

  it("đổi thứ tự: mã trùng bị từ chối", async () => {
    expect(await reorderLands([LAND, LAND])).toEqual({ ok: false, error: "Danh sách có mã bị trùng" });
  });
});

describe("khu vực", () => {
  it("tạo mới: thứ tự mở khóa sau cùng, ghi 1 dòng nhật ký", async () => {
    const db = fakeDb({
      "lands.select": [{ data: { id: LAND } }],
      "areas.select": [{ data: { unlock_order: 2 } }],
      "areas.insert": [{ data: { id: AREA_2, name: "Chợ" } }],
    });
    expect((await createArea(LAND, validArea)).ok).toBe(true);
    expect(db.writes()[0].payload).toMatchObject({
      land_id: LAND,
      unlock_order: 3,
      skill: "conversation",
      scene: "market",
      unlock_requirement: { lessons_done: 3 },
    });
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it("đổi kỹ năng của khu vực đã có bài học: phải xác nhận trước", async () => {
    const db = fakeDb({
      "areas.select": [{ data: { id: AREA, skill: "vocabulary", land_id: LAND } }],
      "lessons.select": [{ count: 2 }],
    });
    expect(await updateArea(AREA, validArea)).toEqual({
      ok: false,
      code: "confirm_skill_change",
      lessonCount: 2,
      error: "Khu vực đang có 2 bài học soạn cho kỹ năng cũ. Xác nhận nếu vẫn muốn đổi kỹ năng.",
    });
    expect(db.writes()).toEqual([]);
    expect(logAction).not.toHaveBeenCalled();
  });

  it("đổi kỹ năng sau khi xác nhận: lưu và ghi 1 dòng nhật ký", async () => {
    const before = { id: AREA, skill: "vocabulary", land_id: LAND };
    const after = { id: AREA, skill: "conversation", land_id: LAND, name: "Chợ" };
    const db = fakeDb({ "areas.select": [{ data: before }], "areas.update": [{ data: after }] });
    expect((await updateArea(AREA, validArea, { confirmSkillChange: true })).ok).toBe(true);
    expect(db.writes()).toHaveLength(1);
    expect(logAction).toHaveBeenCalledWith({
      action: "areas.update",
      targetTable: "areas",
      targetId: AREA,
      before,
      after,
    });
  });

  it("bật/tắt: nhật ký chỉ ghi trạng thái trước / sau", async () => {
    fakeDb({
      "areas.select": [{ data: { id: AREA, is_active: false } }],
      "areas.update": [{ data: { id: AREA, is_active: true, name: "Chợ", land_id: LAND } }],
    });
    expect(await setAreaActive(AREA, true)).toEqual({ ok: true, message: 'Đã bật khu vực "Chợ"' });
    expect(logAction).toHaveBeenCalledWith({
      action: "areas.set_active",
      targetTable: "areas",
      targetId: AREA,
      before: { is_active: false },
      after: { is_active: true },
    });
  });

  it("đổi thứ tự: đảo ngược đủ danh sách thì gọi rpc reorder_areas", async () => {
    const db = fakeDb({ "areas.select": [{ data: [{ id: AREA }, { id: AREA_2 }] }] });
    expect((await reorderAreas(LAND, [AREA_2, AREA])).ok).toBe(true);
    expect(db.writes()).toEqual([
      { key: "rpc.reorder_areas", payload: { p_land_id: LAND, ids: [AREA_2, AREA] } },
    ]);
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it("ghi được dữ liệu nhưng nhật ký lỗi: báo rõ, không im lặng", async () => {
    fakeDb({
      "areas.select": [{ data: { id: AREA, is_active: true } }],
      "areas.update": [{ data: { id: AREA, is_active: false, name: "Chợ", land_id: LAND } }],
    });
    vi.mocked(logAction).mockRejectedValueOnce(new Error("insert failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await setAreaActive(AREA, false)).toEqual({
      ok: false,
      error: "Đã lưu thay đổi nhưng KHÔNG ghi được nhật ký quản trị. Hãy báo admin kiểm tra.",
    });
  });
});

describe("xóa vùng đất", () => {
  const land = { id: LAND, slug: "tieng-han", name: "Tiếng Hàn" };

  it("chỉ admin: editor bị từ chối trước khi đụng database", async () => {
    vi.mocked(requireRole).mockRejectedValue(new AuthError("forbidden"));
    expect(await deleteLand(LAND, "tieng-han")).toEqual({
      ok: false,
      error: "Bạn không có quyền làm việc này",
    });
    expect(requireRole).toHaveBeenCalledWith(["admin"]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("gõ sai slug thì không xóa", async () => {
    const db = fakeDb({ "lands.select": [{ data: land }] });
    expect(await deleteLand(LAND, "tieng-anh")).toEqual({
      ok: false,
      error: 'Gõ đúng slug "tieng-han" để xác nhận xóa',
    });
    expect(db.writes()).toEqual([]);
  });

  it("vùng đất còn khu vực / từ vựng thì không xóa, gợi ý tắt thay vì xóa", async () => {
    const db = fakeDb({
      "lands.select": [{ data: land }],
      "areas.select": [{ count: 2 }],
      "words.select": [{ count: 5 }],
    });
    expect(await deleteLand(LAND, "tieng-han")).toEqual({
      ok: false,
      error:
        "Vùng đất còn 2 khu vực và 5 từ vựng nên không xóa được. Hãy tắt vùng đất để ẩn, hoặc chuyển / xóa nội dung bên trong trước.",
    });
    expect(db.writes()).toEqual([]);
    expect(logAction).not.toHaveBeenCalled();
  });

  it("vùng đất trống: xóa và ghi đúng 1 dòng nhật ký (lưu dữ liệu trước khi xóa)", async () => {
    const db = fakeDb({
      "lands.select": [{ data: land }],
      "areas.select": [{ count: 0 }],
      "words.select": [{ count: 0 }],
      "lands.delete": [{ data: [{ id: LAND }] }],
    });
    expect(await deleteLand(LAND, " tieng-han ")).toEqual({
      ok: true,
      message: 'Đã xóa vùng đất "Tiếng Hàn"',
    });
    expect(db.writes().map((c) => c.key)).toEqual(["lands.delete"]);
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledWith({
      action: "lands.delete",
      targetTable: "lands",
      targetId: LAND,
      before: land,
    });
  });

  it("database chặn (còn dữ liệu người chơi) thì báo lỗi, không ghi nhật ký", async () => {
    fakeDb({
      "lands.select": [{ data: land }],
      "areas.select": [{ count: 0 }],
      "words.select": [{ count: 0 }],
      "lands.delete": [
        { error: { code: "23503", message: "violates foreign key constraint farm_plots_land_id_fkey" } },
      ],
    });
    expect(await deleteLand(LAND, "tieng-han")).toEqual({
      ok: false,
      error:
        "Vùng đất vẫn còn dữ liệu liên quan (khu vực, từ vựng hoặc tiến độ người chơi) nên không xóa được",
    });
    expect(logAction).not.toHaveBeenCalled();
  });

  it("RLS chặn (không dòng nào bị xóa) thì báo lỗi", async () => {
    fakeDb({
      "lands.select": [{ data: land }],
      "areas.select": [{ count: 0 }],
      "words.select": [{ count: 0 }],
      "lands.delete": [{ data: [] }],
    });
    expect(await deleteLand(LAND, "tieng-han")).toEqual({
      ok: false,
      error: "Không xóa được vùng đất (không có quyền)",
    });
  });
});
