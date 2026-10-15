"use server";

/**
 * Đăng ký / đăng nhập trang quản trị.
 * Đăng nhập: mật khẩu (aal1) rồi mã TOTP (aal2), trừ khi công tắc admin_settings.require_mfa đang tắt.
 * Tài khoản 'player' bị chặn ngay sau bước mật khẩu.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { USERNAME_PATTERN, USERNAME_RULE, isRole, isStaffRole } from "@lw/shared";
import type { ActionState } from "@/lib/action-state";
import { getSession, readMfaRequired } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PLAYER_BLOCKED = "Tài khoản người chơi không được vào trang quản trị";
const NOT_GRANTED =
  "Tài khoản chưa được cấp quyền quản trị. Hãy nhờ admin cấp vai trò ở trang Người chơi rồi đăng nhập lại.";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { values: { email }, error: "Nhập email và mật khẩu" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { values: { email }, error: "Email hoặc mật khẩu không đúng" };

  // Dùng chính client vừa đăng nhập (đã giữ phiên mới) để đọc vai trò qua RLS.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || !isRole(profile?.role) || !isStaffRole(profile.role)) {
    // scope "local": chỉ đăng xuất phiên này, không đá người chơi khỏi game trên thiết bị khác.
    await supabase.auth.signOut({ scope: "local" });
    if (profileError) {
      console.error("[signIn] Không đọc được profiles:", profileError.message);
      return {
        values: { email },
        error: "Không đọc được vai trò tài khoản: database chưa sẵn sàng (chưa chạy migration?)",
      };
    }
    return { values: { email }, error: NOT_GRANTED };
  }

  // Công tắc 2 lớp đang tắt (admin_settings.require_mfa = false) thì vào thẳng trang quản trị.
  redirect((await readMfaRequired(supabase)) ? "/login/mfa" : "/");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * Đăng ký tài khoản quản trị. Tài khoản mới LUÔN là 'player' (trigger handle_new_user trong database),
 * nên chưa vào được trang quản trị cho tới khi một admin cấp vai trò ở trang Người chơi.
 */
export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  // NFC: chữ có dấu luôn ở dạng dựng sẵn (1 ký tự), khớp kiểm tra của database.
  const username = String(formData.get("username") ?? "")
    .trim()
    .normalize("NFC");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!EMAIL.test(email)) return { values: { email, username }, error: "Email không hợp lệ" };
  if (!USERNAME_PATTERN.test(username)) return { values: { email, username }, error: USERNAME_RULE };
  if (password.length < MIN_PASSWORD)
    return { values: { email, username }, error: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` };
  if (password !== confirm) return { values: { email, username }, error: "Mật khẩu nhập lại không khớp" };

  // Next đã kiểm tra Origin khớp Host cho server action, nên dùng được để tạo link xác nhận email.
  const origin = (await headers()).get("origin") ?? "http://localhost:3001";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Chỉ gửi username. KHÔNG gửi vai trò: metadata do người dùng tự điền, database bỏ qua nó.
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    if (error.code === "user_already_exists")
      return { values: { email, username }, error: "Email này đã có tài khoản, hãy đăng nhập" };
    if (error.code === "weak_password")
      return { values: { email, username }, error: "Mật khẩu quá yếu, hãy dùng mật khẩu khác" };
    if (error.code === "over_email_send_rate_limit")
      return { values: { email, username }, error: "Gửi email quá nhiều lần, thử lại sau ít phút" };
    if (error.code === "signup_disabled")
      return { values: { email, username }, error: "Hệ thống đang tắt đăng ký" };
    return { values: { email, username }, error: "Không tạo được tài khoản, thử lại sau" };
  }

  // Dự án tắt xác nhận email thì signUp đăng nhập luôn: đăng xuất ngay vì tài khoản chưa có quyền.
  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: "Đã tạo tài khoản. Hãy báo admin cấp quyền, sau đó đăng nhập." };
  }
  return {
    message: `Đã gửi email xác nhận tới ${email}. Bấm link trong email, rồi báo admin cấp quyền để đăng nhập.`,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export type EnrollResult = { factorId: string; qrCode: string; secret: string } | { error: string };

/** Lần đầu đăng nhập: tạo khóa TOTP mới để quét bằng ứng dụng xác thực. */
export async function startTotpEnroll(): Promise<EnrollResult> {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) return { error: PLAYER_BLOCKED };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Không đọc được thông tin xác thực hai lớp, thử lại sau" };
  if (factors.totp.length > 0) return { error: "Tài khoản đã thiết lập xác thực hai lớp" };

  // Dọn các lần thiết lập dang dở (chưa xác minh) để không vượt giới hạn số khóa.
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { error: "Không tạo được mã QR, thử lại sau" };

  const qr = data.totp.qr_code;
  return {
    factorId: data.id,
    qrCode: qr.startsWith("data:") ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`,
    secret: data.totp.secret,
  };
}

/** Xác minh mã 6 số. Có `factorId` trong form = đang thiết lập lần đầu; không có = dùng khóa đã có. */
export async function verifyTotp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) return { error: PLAYER_BLOCKED };

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Mã gồm 6 chữ số" };

  const supabase = await createClient();
  let factorId = String(formData.get("factorId") ?? "");
  if (!factorId) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId = factors?.totp[0]?.id ?? "";
  }
  if (!factorId) return { error: "Tài khoản chưa thiết lập xác thực hai lớp" };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "Mã không đúng hoặc đã hết hạn" };

  redirect("/");
}
