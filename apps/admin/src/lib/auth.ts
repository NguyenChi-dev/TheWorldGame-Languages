/**
 * Kiểm tra đăng nhập và vai trò ở máy chủ (lớp 2 trong 3 lớp bảo mật).
 *
 *   Lớp 1: layout chỉ hiện mục menu đúng vai trò (sectionsForRole trong @lw/shared).
 *   Lớp 2: mọi trang và server action gọi requireRole / requireSection (file này).
 *   Lớp 3: RLS trong database kiểm tra vai trò và xác thực hai lớp lần nữa.
 *
 * Xác thực hai lớp (TOTP) bắt buộc hay không do công tắc admin_settings.require_mfa trong database
 * quyết định (mặc định BẬT). Cả 3 lớp cùng đọc công tắc này, xem migration *_admin_mfa_switch.sql.
 *
 * Vai trò luôn đọc từ profiles.role trong database, không tin user_metadata (người dùng tự sửa được).
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import {
  ADMIN_SECTIONS,
  isRole,
  isStaffRole,
  type AdminSectionKey,
  type Role,
  type StaffRole,
} from "@lw/shared";
import { isAuthCookie } from "@/lib/supabase/cookie";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface Session {
  userId: string;
  email: string | null;
  role: Role;
  /** "aal2" khi phiên đã qua xác thực hai lớp (TOTP). */
  aal: string;
  /** Công tắc admin_settings.require_mfa: hiện có bắt buộc xác thực hai lớp không. */
  mfaRequired: boolean;
}

/** Phiên đã qua requireRole: là nhân viên, và đã xác thực hai lớp nếu công tắc đang bật. */
export interface StaffSession extends Session {
  role: StaffRole;
}

/** Hỏi database có đang bắt buộc xác thực hai lớp không. Lỗi (ví dụ chưa chạy migration) thì coi như CÓ. */
export async function readMfaRequired(supabase: SupabaseServerClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_mfa_required");
  return error ? true : data !== false;
}

/** Đã đăng nhập xong chưa: qua 2 lớp, hoặc công tắc 2 lớp đang tắt. */
export function isSignInComplete(session: Session): boolean {
  return !session.mfaRequired || session.aal === "aal2";
}

/**
 * - unauthenticated: chưa đăng nhập / phiên hết hạn / bị thu hồi / cookie bị sửa → đăng nhập lại.
 * - forbidden: đã đăng nhập nhưng không đủ quyền (KHÔNG phải phiên hết hạn).
 * - mfa_required: thiếu xác thực hai lớp.
 * - unavailable: không hỏi được Supabase Auth (mất mạng / máy chủ lỗi). Không xóa phiên, cho thử lại.
 */
export type AuthErrorCode = "unauthenticated" | "forbidden" | "mfa_required" | "unavailable";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  unauthenticated: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.",
  unavailable: "Không kết nối được máy chủ xác thực. Kiểm tra mạng rồi thử lại.",
  forbidden: "Bạn không có quyền làm việc này",
  mfa_required: "Cần xác thực hai lớp trước khi vào trang quản trị",
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * Phiên hiện tại từ cookie, hoặc null nếu chưa đăng nhập / phiên không còn hiệu lực.
 * Gọi nhiều lần trong 1 request chỉ đọc 1 lần.
 *
 * 2 bước xác minh:
 *   1. getClaims: kiểm tra chữ ký + hạn dùng của JWT (Supabase tự làm mới token hết hạn bằng refresh token).
 *   2. getUser: hỏi Supabase Auth. JWT của dự án ký ES256 nên bước 1 chạy tại chỗ, không biết phiên đã bị
 *      thu hồi (đăng xuất mọi nơi) hay tài khoản đã bị khóa: token cũ vẫn "hợp lệ" tới ~1 giờ. Bước 2 chặn ngay.
 *
 * Ném AuthError("unavailable") khi không hỏi được Supabase (mất mạng): KHÔNG coi là đăng xuất.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  // Với cookie rác, getClaims có thể NÉM lỗi thay vì trả về `error`: coi như chưa đăng nhập.
  const { data, error } = await supabase.auth.getClaims().catch(() => ({ data: null, error: true }));
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== "authenticated") return null;

  const [{ data: profile, error: profileError }, mfaRequired, account] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle(),
    readMfaRequired(supabase),
    supabase.auth.getUser().catch((error: unknown) => ({ data: { user: null }, error })),
  ]);
  if (account.error) {
    const error = account.error as { status?: number };
    if (isAuthRetryableFetchError(account.error) || (error.status ?? 0) >= 500 || error.status === 0)
      throw new AuthError("unavailable");
    // 401/403: phiên bị thu hồi, tài khoản bị khóa hoặc đã xóa.
    return null;
  }
  if (account.data.user?.id !== claims.sub) return null;
  if (profileError) throw new Error(`Không đọc được vai trò người dùng: ${profileError.message}`);

  return {
    userId: claims.sub,
    email: claims.email ?? null,
    // Chưa có hồ sơ = người chơi thường.
    role: isRole(profile?.role) ? profile.role : "player",
    aal: claims.aal ?? "aal1",
    mfaRequired,
  };
});

/**
 * Ném AuthError nếu người gọi không có một trong các vai trò `roles`, hoặc chưa xác thực hai lớp
 * (khi công tắc 2 lớp đang bật).
 * Tài khoản 'player' không bao giờ qua được, kể cả khi `roles` có 'player'.
 * BẮT BUỘC gọi ở đầu mọi server action: ẩn nút trên giao diện không phải là bảo mật.
 */
export async function requireRole(roles: readonly Role[]): Promise<StaffSession> {
  const session = await getSession();
  if (!session) throw new AuthError("unauthenticated");
  if (!isStaffRole(session.role) || !roles.includes(session.role)) throw new AuthError("forbidden");
  if (!isSignInComplete(session)) throw new AuthError("mfa_required");
  return { ...session, role: session.role };
}

/**
 * Dùng ở đầu mỗi trang trong (admin): giống requireRole theo bảng ADMIN_SECTIONS,
 * nhưng chuyển hướng thay vì ném lỗi.
 */
export async function requireSection(key: AdminSectionKey): Promise<StaffSession> {
  try {
    return await requireRole(ADMIN_SECTIONS[key].roles);
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (error.code === "unavailable") throw error;
    if (error.code === "unauthenticated") {
      // Còn cookie phiên mà vẫn bị từ chối: phiên hết hạn / bị thu hồi → báo "hết hạn" ở trang đăng nhập.
      const stale = (await cookies()).getAll().some((cookie) => isAuthCookie(cookie.name));
      redirect(stale ? "/login?expired=1" : "/login");
    }
    if (error.code === "mfa_required") redirect("/login/mfa");
    // Không có quyền với trang này: về Tổng quan. Không có quyền cả Tổng quan (người chơi): về login.
    redirect(key === "overview" ? "/login?denied=1" : "/?denied=1");
  }
}
