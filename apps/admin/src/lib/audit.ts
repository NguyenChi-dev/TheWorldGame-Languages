/**
 * Ghi nhật ký thao tác quản trị vào bảng admin_logs.
 *
 * Bảng chỉ cho THÊM và ĐỌC (xem supabase/migrations/..._admin_logs.sql). RLS bắt buộc
 * actor_id và actor_role đúng là người đang đăng nhập, nên không giả danh người khác được.
 *
 * Lưu ý: thao tác chính và dòng nhật ký là 2 câu lệnh riêng, không cùng giao dịch.
 * Nếu ghi nhật ký lỗi, hàm NÉM lỗi để server action báo ra ngoài, không im lặng bỏ qua.
 */
import "server-only";
import { STAFF_ROLES } from "@lw/shared";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface LogActionInput {
  /** Tên thao tác, dạng "<bảng>.<việc>", ví dụ "profiles.update_role". */
  action: string;
  targetTable: string;
  targetId?: string | null;
  /** Dữ liệu trước và sau khi đổi (lưu dạng jsonb). */
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

export async function logAction({
  action,
  targetTable,
  targetId = null,
  before = null,
  after = null,
  reason = null,
}: LogActionInput): Promise<void> {
  const session = await requireRole(STAFF_ROLES);
  const supabase = await createClient();

  // Không gọi .select() sau insert: chỉ admin được đọc admin_logs.
  const { error } = await supabase.from("admin_logs").insert({
    actor_id: session.userId,
    actor_role: session.role,
    action,
    target_table: targetTable,
    target_id: targetId,
    before,
    after,
    reason: reason?.trim() || null,
  });
  if (error) throw new Error(`Không ghi được nhật ký quản trị: ${error.message}`);
}
