"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-state";
import { AuthError, requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Bật / tắt công tắc bắt buộc xác thực hai lớp cho mọi nhân viên (admin_settings.require_mfa).
 * Lớp 2: requirePermission("settings.manage") — admin, luôn cần AAL2.
 * Lớp 3: hàm database set_admin_mfa_required kiểm tra lại admin + AAL2 và tự ghi admin_logs
 * (migration 0009), nên không gọi logAction ở đây.
 */
export async function setRequireMfa(required: boolean): Promise<ActionResult> {
  if (typeof required !== "boolean") return { ok: false, error: "Giá trị không hợp lệ" };
  try {
    await requirePermission("settings.manage");
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.message };
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_admin_mfa_required", { p_required: required });
  if (error) {
    // Hàm chưa có: database chưa chạy migration 0009.
    if (error.code === "PGRST202" || error.code === "42883")
      return {
        ok: false,
        error: "Database chưa có chức năng này: cần chạy migration 0009_xac_thuc_hai_lop_bat_buoc",
      };
    if (error.code === "42501")
      return { ok: false, error: "Chỉ admin đã xác thực hai lớp mới đổi được công tắc này" };
    console.error("[settings] Không đổi được công tắc 2 lớp:", error.message);
    return { ok: false, error: "Không lưu được cài đặt, thử lại sau" };
  }

  revalidatePath("/settings");
  return {
    ok: true,
    message: required
      ? "Đã bật: mọi nhân viên phải xác thực hai lớp khi đăng nhập"
      : "Đã tắt: nhân viên vào được bằng mật khẩu; thao tác nhạy cảm vẫn cần xác thực hai lớp",
  };
}
