"use server";

/**
 * Backend của phần Vùng đất / Khu vực (server action).
 *
 * Mỗi hàm làm đúng thứ tự:
 *   1. requireRole(['admin','editor'])   lớp 2: chặn sai vai trò ngay ở máy chủ.
 *   2. Kiểm tra input bằng Zod           schema dùng chung trong @lw/shared/schemas.
 *   3. Ghi bằng Supabase client của NGƯỜI ĐANG ĐĂNG NHẬP (không dùng service_role), nên RLS
 *      trong database kiểm tra vai trò lần nữa (lớp 3).
 *   4. logAction với before / after      đúng MỘT dòng admin_logs cho mỗi thao tác ghi.
 *
 * Xóa: chỉ vùng đất, chỉ admin, chỉ khi vùng đất không còn khu vực / từ vựng / dữ liệu người chơi
 * (database cũng chặn bằng ON DELETE RESTRICT). Thường thì nên TẮT is_active để ẩn thay vì xóa.
 * Khu vực chưa có chức năng xóa.
 */
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { AreaInput, IdList, LandInput } from "@lw/shared/schemas";
import type { ActionResult } from "@/lib/action-state";
import { logAction, type LogActionInput } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import { UUID } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

const CONTENT_EDITORS = ["admin", "editor"] as const;
/** Xóa vùng đất là thao tác không hoàn tác được: chỉ admin. */
const LAND_DELETERS = ["admin"] as const;

type Row = Record<string, unknown>;

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Lớp 2: mặc định chỉ admin, editor. Trả về thông báo lỗi (nếu bị chặn) thay vì ném lỗi ra giao diện. */
async function guard(roles: readonly ("admin" | "editor")[] = CONTENT_EDITORS): Promise<string | null> {
  try {
    await requireRole(roles);
    return null;
  } catch (error) {
    if (error instanceof AuthError) return error.message;
    throw error;
  }
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Dữ liệu gửi lên không hợp lệ";
}

/** Đổi lỗi Postgres/RLS thành câu tiếng Việt dễ hiểu. */
function dbError(error: PostgrestError | null, fallback: string): string {
  if (!error) return fallback;
  const text = `${error.message} ${error.details ?? ""}`;
  if (error.code === "23505") {
    if (text.includes("lands_slug_key")) return "Slug này đã được dùng cho vùng đất khác";
    if (text.includes("lands_language_code_key")) return "Mã ngôn ngữ này đã có vùng đất khác";
    if (text.includes("areas_land_order_key")) return "Thứ tự mở khóa bị trùng. Tải lại trang rồi thử lại";
    return "Dữ liệu bị trùng với một mục đã có";
  }
  if (error.code === "42501") return "Bạn không có quyền làm việc này";
  if (error.code === "23514") return "Dữ liệu không đúng định dạng";
  if (error.code === "23503") {
    if (text.includes("cover_media_id")) return "Ảnh bìa không tồn tại. Hãy tải ảnh lên lại";
    return "Vùng đất không tồn tại";
  }
  console.error("[lands/actions] Lỗi database:", error);
  return fallback;
}

/** Ghi nhật ký. Nếu lỗi: thao tác đã lưu rồi, báo rõ cho người dùng thay vì im lặng. */
async function audit(input: LogActionInput): Promise<string | null> {
  try {
    await logAction(input);
    return null;
  } catch (error) {
    console.error("[lands/actions] Không ghi được admin_logs:", error);
    return "Đã lưu thay đổi nhưng KHÔNG ghi được nhật ký quản trị. Hãy báo admin kiểm tra.";
  }
}

const landRow = (input: ReturnType<typeof LandInput.parse>) => ({
  name: input.name,
  slug: input.slug,
  language_code: input.languageCode,
  description: input.description,
  cover_media_id: input.coverMediaId,
});

const areaRow = (input: ReturnType<typeof AreaInput.parse>) => ({
  name: input.name,
  skill: input.skill,
  scene: input.scene,
  cover_media_id: input.coverMediaId,
  unlock_requirement: input.unlockRequirement,
});

function revalidateLand(landId?: string) {
  revalidatePath("/lands");
  if (landId) revalidatePath(`/lands/${landId}`, "layout");
}

// =============================================================================
// VÙNG ĐẤT
// =============================================================================

export async function createLand(input: unknown): Promise<ActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return fail(denied);
  const parsed = LandInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  // Vùng mới đứng cuối danh sách. Mặc định đang TẮT (database), bật sau khi chuẩn bị xong.
  const { data: last } = await supabase
    .from("lands")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("lands")
    .insert({ ...landRow(parsed.data), sort_order: Number(last?.sort_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error || !data) return fail(dbError(error, "Không tạo được vùng đất"));

  const auditError = await audit({
    action: "lands.create",
    targetTable: "lands",
    targetId: data.id,
    after: data,
  });
  revalidateLand();
  if (auditError) return fail(auditError);
  return { ok: true, message: `Đã tạo vùng đất "${data.name}" (đang tắt)`, data: { id: data.id } };
}

export async function updateLand(id: string, input: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(id)) return fail("Mã vùng đất không hợp lệ");
  const parsed = LandInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: before } = await supabase.from("lands").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Không tìm thấy vùng đất");

  const { data: after, error } = await supabase
    .from("lands")
    .update(landRow(parsed.data))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !after) return fail(dbError(error, "Không lưu được vùng đất"));

  const auditError = await audit({
    action: "lands.update",
    targetTable: "lands",
    targetId: id,
    before,
    after,
  });
  revalidateLand(id);
  if (auditError) return fail(auditError);
  return { ok: true, message: `Đã lưu vùng đất "${after.name}"` };
}

export async function setLandActive(id: string, isActive: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(id) || typeof isActive !== "boolean") return fail("Dữ liệu gửi lên không hợp lệ");

  const supabase = await createClient();
  const { data: before } = await supabase.from("lands").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Không tìm thấy vùng đất");

  const { data: after, error } = await supabase
    .from("lands")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !after) return fail(dbError(error, "Không đổi được trạng thái vùng đất"));

  const auditError = await audit({
    action: "lands.set_active",
    targetTable: "lands",
    targetId: id,
    before: { is_active: before.is_active },
    after: { is_active: after.is_active },
  });
  revalidateLand(id);
  if (auditError) return fail(auditError);
  return { ok: true, message: `${isActive ? "Đã bật" : "Đã tắt"} vùng đất "${after.name}"` };
}

export async function reorderLands(ids: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  const parsed = IdList.safeParse(ids);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("lands")
    .select("id, sort_order")
    .order("sort_order");
  if (readError || !before) return fail(dbError(readError, "Không đọc được danh sách vùng đất"));
  // Phải gửi ĐỦ mọi vùng đất, nếu không thứ tự sẽ lệch với người khác vừa thêm/sửa.
  const current = new Set(before.map((row: Row) => String(row.id)));
  if (current.size !== parsed.data.length || !parsed.data.every((id) => current.has(id))) {
    return fail("Danh sách vùng đất đã thay đổi. Tải lại trang rồi thử lại");
  }

  const { error } = await supabase.rpc("reorder_lands", { ids: parsed.data });
  if (error) return fail(dbError(error, "Không đổi được thứ tự vùng đất"));

  const auditError = await audit({
    action: "lands.reorder",
    targetTable: "lands",
    before: before.map((row: Row) => row.id),
    after: parsed.data,
  });
  revalidateLand();
  if (auditError) return fail(auditError);
  return { ok: true, message: "Đã đổi thứ tự vùng đất" };
}

// =============================================================================
// KHU VỰC
// =============================================================================

export async function createArea(landId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(landId)) return fail("Mã vùng đất không hợp lệ");
  const parsed = AreaInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: land } = await supabase.from("lands").select("id").eq("id", landId).maybeSingle();
  if (!land) return fail("Không tìm thấy vùng đất");
  // Khu vực mới mở khóa sau cùng.
  const { data: last } = await supabase
    .from("areas")
    .select("unlock_order")
    .eq("land_id", landId)
    .order("unlock_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("areas")
    .insert({ ...areaRow(parsed.data), land_id: landId, unlock_order: Number(last?.unlock_order ?? -1) + 1 })
    .select("*")
    .single();
  if (error || !data) return fail(dbError(error, "Không tạo được khu vực"));

  const auditError = await audit({
    action: "areas.create",
    targetTable: "areas",
    targetId: data.id,
    after: data,
  });
  revalidateLand(landId);
  if (auditError) return fail(auditError);
  return { ok: true, message: `Đã tạo khu vực "${data.name}" (đang tắt)`, data: { id: data.id } };
}

/**
 * Sửa khu vực. Đổi kỹ năng của khu vực ĐÃ CÓ bài học thì phải gửi lại với confirmSkillChange = true
 * (giao diện hiện cảnh báo trước), vì bài học được soạn theo mini-game của kỹ năng cũ.
 */
export async function updateArea(
  id: string,
  input: unknown,
  options: { confirmSkillChange?: boolean } = {},
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(id)) return fail("Mã khu vực không hợp lệ");
  const parsed = AreaInput.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: before } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Không tìm thấy khu vực");

  if (before.skill !== parsed.data.skill && !options.confirmSkillChange) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("area_id", id);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        code: "confirm_skill_change",
        lessonCount: count ?? 0,
        error: `Khu vực đang có ${count} bài học soạn cho kỹ năng cũ. Xác nhận nếu vẫn muốn đổi kỹ năng.`,
      };
    }
  }

  const { data: after, error } = await supabase
    .from("areas")
    .update(areaRow(parsed.data))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !after) return fail(dbError(error, "Không lưu được khu vực"));

  const auditError = await audit({
    action: "areas.update",
    targetTable: "areas",
    targetId: id,
    before,
    after,
  });
  revalidateLand(String(after.land_id));
  if (auditError) return fail(auditError);
  return { ok: true, message: `Đã lưu khu vực "${after.name}"` };
}

export async function setAreaActive(id: string, isActive: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(id) || typeof isActive !== "boolean") return fail("Dữ liệu gửi lên không hợp lệ");

  const supabase = await createClient();
  const { data: before } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Không tìm thấy khu vực");

  const { data: after, error } = await supabase
    .from("areas")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !after) return fail(dbError(error, "Không đổi được trạng thái khu vực"));

  const auditError = await audit({
    action: "areas.set_active",
    targetTable: "areas",
    targetId: id,
    before: { is_active: before.is_active },
    after: { is_active: after.is_active },
  });
  revalidateLand(String(after.land_id));
  if (auditError) return fail(auditError);
  return { ok: true, message: `${isActive ? "Đã bật" : "Đã tắt"} khu vực "${after.name}"` };
}

export async function reorderAreas(landId: string, ids: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return fail(denied);
  if (!UUID.test(landId)) return fail("Mã vùng đất không hợp lệ");
  const parsed = IdList.safeParse(ids);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("areas")
    .select("id, unlock_order")
    .eq("land_id", landId)
    .order("unlock_order");
  if (readError || !before) return fail(dbError(readError, "Không đọc được danh sách khu vực"));
  // Phải gửi ĐỦ khu vực của vùng đất: gửi thiếu sẽ làm thứ tự mới trùng với khu vực không được gửi.
  const current = new Set(before.map((row: Row) => String(row.id)));
  if (current.size !== parsed.data.length || !parsed.data.every((id) => current.has(id))) {
    return fail("Danh sách khu vực đã thay đổi. Tải lại trang rồi thử lại");
  }

  const { error } = await supabase.rpc("reorder_areas", { p_land_id: landId, ids: parsed.data });
  if (error) return fail(dbError(error, "Không đổi được thứ tự khu vực"));

  const auditError = await audit({
    action: "areas.reorder",
    targetTable: "lands",
    targetId: landId,
    before: before.map((row: Row) => row.id),
    after: parsed.data,
  });
  revalidateLand(landId);
  if (auditError) return fail(auditError);
  return { ok: true, message: "Đã đổi thứ tự mở khóa khu vực" };
}

// =============================================================================
// XÓA VÙNG ĐẤT
// =============================================================================

/**
 * Xóa vĩnh viễn một vùng đất. Chỉ admin; phải gõ đúng slug để xác nhận.
 * Vùng đất còn khu vực, từ vựng hoặc tiến độ người chơi thì không xóa (database cũng chặn).
 */
export async function deleteLand(id: string, confirmSlug: string): Promise<ActionResult> {
  const denied = await guard(LAND_DELETERS);
  if (denied) return fail(denied);
  if (!UUID.test(id)) return fail("Mã vùng đất không hợp lệ");

  const supabase = await createClient();
  const { data: before } = await supabase.from("lands").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Không tìm thấy vùng đất");
  if (typeof confirmSlug !== "string" || confirmSlug.trim() !== before.slug) {
    return fail(`Gõ đúng slug "${before.slug}" để xác nhận xóa`);
  }

  const [{ count: areaCount }, { count: wordCount }] = await Promise.all([
    supabase.from("areas").select("id", { count: "exact", head: true }).eq("land_id", id),
    supabase.from("words").select("id", { count: "exact", head: true }).eq("land_id", id),
  ]);
  if ((areaCount ?? 0) > 0 || (wordCount ?? 0) > 0) {
    return fail(
      `Vùng đất còn ${areaCount ?? 0} khu vực và ${wordCount ?? 0} từ vựng nên không xóa được. ` +
        "Hãy tắt vùng đất để ẩn, hoặc chuyển / xóa nội dung bên trong trước.",
    );
  }

  const { data: deleted, error } = await supabase.from("lands").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") {
      return fail(
        "Vùng đất vẫn còn dữ liệu liên quan (khu vực, từ vựng hoặc tiến độ người chơi) nên không xóa được",
      );
    }
    return fail(dbError(error, "Không xóa được vùng đất"));
  }
  if (!deleted || deleted.length === 0) return fail("Không xóa được vùng đất (không có quyền)");

  const auditError = await audit({ action: "lands.delete", targetTable: "lands", targetId: id, before });
  revalidateLand();
  if (auditError) return fail(auditError);
  return { ok: true, message: `Đã xóa vùng đất "${before.name}"` };
}
