"use server";

import { revalidatePath } from "next/cache";
import { isRole, rolesFor } from "@lw/shared";
import type { AdminPlayerActionResponse } from "@lw/shared/api";
import type { ActionResult, ActionState } from "@/lib/action-state";
import { ApiCallError, apiRequest } from "@/lib/api";
import { logAction } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đổi vai trò của một người dùng khác. Chỉ admin. RLS chặn lại lần nữa ở database. */
export async function changeUserRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let session;
  try {
    session = await requireRole(rolesFor("staff.manage"));
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const role = formData.get("role");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(userId)) return { error: "Mã người dùng không hợp lệ" };
  if (!isRole(role)) return { error: "Vai trò không hợp lệ" };
  if (!reason) return { error: "Nhập lý do" };
  if (userId === session.userId) return { error: "Không được tự đổi vai trò của mình" };

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (readError) return { error: "Không đọc được hồ sơ, thử lại sau" };
  if (!before) return { error: "Không tìm thấy người dùng" };

  const { data: after, error: updateError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select("id, role")
    .maybeSingle();
  // RLS chặn thì không báo lỗi mà chỉ không có dòng nào được sửa.
  if (updateError || !after) return { error: "Database từ chối thay đổi" };

  await logAction({
    action: "profiles.update_role",
    targetTable: "profiles",
    targetId: userId,
    before,
    after,
    reason,
  });

  revalidatePath("/players");
  return { message: `Đã đổi vai trò thành ${role}` };
}

// =============================================================================
// QUẢN LÝ TÀI KHOẢN NGƯỜI CHƠI (đăng ký / đăng nhập)
//
// Dữ liệu đăng nhập nằm ở auth.users, chỉ khóa bí mật đọc / sửa được, nên các thao tác dưới đây
// gọi qua apps/api (/admin/players/...). apps/api kiểm tra lại token, vai trò admin, và ghi nhật ký.
// =============================================================================

/** Lớp 2: chỉ admin. Trả thông báo lỗi thay vì ném lỗi ra giao diện. */
async function adminGuard(id: string): Promise<string | null> {
  try {
    await requireRole(rolesFor("players.manage"));
  } catch (error) {
    if (error instanceof AuthError) return error.message;
    throw error;
  }
  return UUID.test(id) ? null : "Mã người chơi không hợp lệ";
}

async function callPlayerApi(
  id: string,
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ActionResult> {
  const denied = await adminGuard(id);
  if (denied) return { ok: false, error: denied };
  try {
    const result = await apiRequest<AdminPlayerActionResponse>(`/admin/players/${id}${path}`, {
      method,
      body,
    });
    revalidatePath("/players");
    return { ok: true, message: result.message };
  } catch (error) {
    if (error instanceof ApiCallError) return { ok: false, error: error.message };
    throw error;
  }
}

/** Xác nhận email thay người chơi. */
export async function confirmPlayerEmail(id: string) {
  return callPlayerApi(id, "/confirm-email", "POST");
}

/** Gửi email đặt lại mật khẩu (admin không bao giờ thấy hay tự đặt mật khẩu của người chơi). */
export async function sendPlayerPasswordReset(id: string) {
  return callPlayerApi(id, "/password-reset", "POST");
}

/** Khóa tài khoản: days = null là vô thời hạn. Bắt buộc lý do. */
export async function banPlayer(id: string, input: { reason: string; days: number | null }) {
  return callPlayerApi(id, "/ban", "POST", input);
}

export async function unbanPlayer(id: string, input: { reason: string }) {
  return callPlayerApi(id, "/unban", "POST", input);
}

export async function renamePlayer(id: string, input: { username: string }) {
  return callPlayerApi(id, "", "PATCH", input);
}

/** Xóa vĩnh viễn. Bắt buộc lý do; giao diện bắt gõ lại email để xác nhận. */
export async function deletePlayer(id: string, input: { reason: string }) {
  return callPlayerApi(id, "", "DELETE", input);
}
