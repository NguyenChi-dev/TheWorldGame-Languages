"use server";

import { rolesFor, type StaffRole } from "@lw/shared";
import { AuthError, requireRole } from "@/lib/auth";

export type SessionStatus =
  | { state: "ok"; userId: string; role: StaffRole }
  | { state: "signed_out" | "forbidden" | "mfa_required" | "unavailable" };

/**
 * Trình duyệt hỏi định kỳ / khi quay lại tab: phiên còn dùng được cho trang quản trị không.
 * Cùng một hàm kiểm tra với mọi trang (requireRole: JWT + Supabase Auth + vai trò + 2 lớp).
 * Chỉ trả trạng thái, id và vai trò hiện hành (đọc từ database), không trả token hay dữ liệu khác.
 */
export async function checkSession(): Promise<SessionStatus> {
  try {
    const session = await requireRole(rolesFor("admin.access"));
    return { state: "ok", userId: session.userId, role: session.role };
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    return { state: error.code === "unauthenticated" ? "signed_out" : error.code };
  }
}
