/**
 * Ghi nhật ký quản trị (bảng admin_logs) từ apps/api.
 * Dùng khóa bí mật nên tự điền người làm (id + vai trò lấy từ token / database, KHÔNG từ trình duyệt).
 * Bảng admin_logs chỉ thêm được, không ai sửa / xóa được (xem migration 0001).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminLogInput {
  actorId: string;
  actorRole: string;
  action: string;
  targetTable: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

/** Trả về thông báo lỗi nếu KHÔNG ghi được (thao tác đã làm xong, chỉ cần báo cho người dùng). */
export async function writeAdminLog(supabase: SupabaseClient, input: AdminLogInput): Promise<string | null> {
  const { error } = await supabase.from("admin_logs").insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    target_table: input.targetTable,
    target_id: input.targetId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason?.trim() || null,
  });
  if (error) {
    console.error("[admin-log] Không ghi được admin_logs:", error.message);
    return "Đã làm xong nhưng KHÔNG ghi được nhật ký quản trị. Hãy báo admin kiểm tra.";
  }
  return null;
}
