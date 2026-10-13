"use server";

import { revalidatePath } from "next/cache";
import { isRole } from "@lw/shared";
import type { ActionState } from "@/lib/action-state";
import { logAction } from "@/lib/audit";
import { AuthError, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đổi vai trò của một người dùng khác. Chỉ admin. RLS chặn lại lần nữa ở database. */
export async function changeUserRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let session;
  try {
    session = await requireRole(["admin"]);
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
