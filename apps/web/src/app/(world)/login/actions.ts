"use server";

/**
 * Backend tài khoản người chơi (server action, chạy ở máy chủ Next.js).
 *
 * Dữ liệu lưu ở Supabase:
 *   - auth.users       email, mật khẩu (Supabase tự mã hóa), trạng thái xác nhận email, lần đăng nhập cuối.
 *   - public.profiles  hồ sơ người chơi: tên nhân vật (username), vai trò (luôn 'player' khi đăng ký).
 *                      Tạo tự động khi đăng ký (trigger handle_new_user, migration 0001).
 * Phiên đăng nhập lưu trong cookie (thư viện @supabase/ssr), proxy.ts làm mới khi sắp hết hạn.
 *
 * Chỉ dùng khóa publishable của Supabase, không dùng khóa bí mật. Mọi thông báo lỗi bằng tiếng Việt
 * và không tiết lộ email nào đã có tài khoản (trừ lúc đăng ký, Supabase vốn báo trùng).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { USERNAME_PATTERN, USERNAME_RULE } from "@lw/shared";
import type { ActionState } from "@/lib/action-state";
import { SERVER_API_URL } from "@/lib/server-api-url";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const readEmail = (formData: FormData) =>
  String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

/** Địa chỉ trang web (để tạo link trong email). Next đã kiểm tra Origin khớp Host cho server action. */
async function siteOrigin() {
  return (await headers()).get("origin") ?? "http://localhost:3000";
}

/** Lỗi gửi email chung cho đăng ký / gửi lại / quên mật khẩu. */
function emailError(code: string | undefined): string | null {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit")
    return "Gửi email quá nhiều lần, thử lại sau ít phút";
  return null;
}

// =============================================================================
// ĐĂNG NHẬP
// =============================================================================

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { values: { email }, error: "Nhập email và mật khẩu" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        values: { email },
        code: "email_not_confirmed",
        error: "Email chưa được xác nhận. Hãy bấm link trong email, hoặc gửi lại email xác nhận.",
      };
    }
    if (error.code === "over_request_rate_limit")
      return { values: { email }, error: "Thử quá nhiều lần, chờ ít phút rồi đăng nhập lại" };
    return { values: { email }, error: "Email hoặc mật khẩu không đúng" };
  }
  redirect("/play");
}

// =============================================================================
// TẠO TÀI KHOẢN
//
// Mặc định tài khoản được tạo ở apps/api (POST /auth/signup, dùng khóa bí mật, đã xác nhận sẵn) rồi
// đăng nhập luôn, KHÔNG cần email xác nhận. Lý do: dịch vụ email có sẵn của Supabase chỉ gửi được rất
// ít email mỗi giờ, đăng ký kiểu "bấm link trong email" hay lỗi và tài khoản không được tạo.
// Khi đã có SMTP riêng: đặt SIGNUP_REQUIRE_EMAIL_CONFIRM=true để bắt xác nhận email như cũ.
// =============================================================================

/** Gọi apps/api tạo tài khoản. Trả về thông báo lỗi (tiếng Việt), hoặc null nếu tạo được. */
async function createAccountViaApi(body: { email: string; password: string; username: string }) {
  const incoming = await headers();
  // Gửi kèm IP của người chơi để apps/api giới hạn số lần tạo tài khoản theo từng người.
  const ip = incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip") || "";
  let response: Response;
  try {
    response = await fetch(`${SERVER_API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(ip ? { "X-Forwarded-For": ip } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return "Không kết nối được máy chủ, thử lại sau";
  }
  if (response.ok) return null;
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Không tạo được tài khoản, thử lại sau";
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = readEmail(formData);
  // NFC: chữ có dấu luôn ở dạng dựng sẵn (1 ký tự), khớp kiểm tra của database.
  const username = String(formData.get("username") ?? "")
    .trim()
    .normalize("NFC");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const values = { email, username };

  if (!USERNAME_PATTERN.test(username)) return { values, error: USERNAME_RULE };
  if (!EMAIL.test(email)) return { values, error: "Email không hợp lệ" };
  if (password.length < MIN_PASSWORD) return { values, error: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` };
  if (password !== confirm) return { values, error: "Mật khẩu nhập lại không khớp" };

  // Mặc định: tạo tài khoản đã xác nhận sẵn qua apps/api rồi đăng nhập luôn (không phụ thuộc email).
  if (process.env.SIGNUP_REQUIRE_EMAIL_CONFIRM !== "true") {
    const created = await createAccountViaApi({ email, password, username });
    if (created) return { values, error: created };
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
      return { values: { email }, error: "Đã tạo tài khoản. Hãy đăng nhập bằng email và mật khẩu vừa đặt" };
    return redirect("/play");
  }

  // SIGNUP_REQUIRE_EMAIL_CONFIRM=true (đã cấu hình SMTP riêng): đăng ký kiểu Supabase, bấm link trong email.
  const supabase = await createClient();
  // Hỏi trước tên còn trống không (database so không phân biệt hoa thường).
  const { data: available, error: checkError } = await supabase.rpc("username_available", {
    p_username: username,
  });
  if (checkError) return { values, error: "Không kiểm tra được tên nhân vật, thử lại sau" };
  if (!available) return { values, error: "Tên nhân vật này đã có người dùng, hãy chọn tên khác" };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Chỉ gửi username. Vai trò KHÔNG lấy từ đây (database luôn đặt 'player').
    options: { data: { username }, emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });

  if (error) {
    if (error.code === "user_already_exists")
      return { values, error: "Email này đã có tài khoản, hãy đăng nhập" };
    if (error.code === "weak_password") return { values, error: "Mật khẩu quá yếu, hãy dùng mật khẩu khác" };
    if (error.code === "signup_disabled") return { values, error: "Hệ thống đang tắt đăng ký" };
    return { values, error: emailError(error.code) ?? "Không tạo được tài khoản, thử lại sau" };
  }
  // Bật xác nhận email: Supabase không báo lỗi khi email đã có tài khoản mà trả về user rỗng (identities = []).
  if (data.user && data.user.identities?.length === 0) {
    return { values, error: "Email này đã có tài khoản, hãy đăng nhập" };
  }

  // Dự án tắt xác nhận email thì đã đăng nhập luôn: vào game.
  if (data.session) redirect("/play");
  return {
    values: { email },
    message: `Đã gửi email xác nhận tới ${email}. Bấm link trong email để vào game.`,
  };
}

/** Gửi lại email xác nhận đăng ký (khi chưa nhận được, hoặc link đã hết hạn). */
export async function resendConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = readEmail(formData);
  if (!EMAIL.test(email)) return { values: { email }, error: "Email không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) {
    const rate = emailError(error.code);
    if (rate) return { values: { email }, error: rate };
  }
  // Trả lời giống nhau dù email có tài khoản hay không (không để người lạ dò email).
  return { values: { email }, message: `Nếu ${email} đang chờ xác nhận, email mới đã được gửi.` };
}

// =============================================================================
// QUÊN MẬT KHẨU
// =============================================================================

/** Gửi email đặt lại mật khẩu. Link trong email dẫn về /auth/callback rồi tới /reset-password. */
export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = readEmail(formData);
  if (!EMAIL.test(email)) return { values: { email }, error: "Email không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    const rate = emailError(error.code);
    if (rate) return { values: { email }, error: rate };
  }
  // Trả lời giống nhau dù email có tài khoản hay không (không để người lạ dò email).
  return {
    values: { email },
    message: `Nếu ${email} có tài khoản, email đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư.`,
  };
}

/** Đặt mật khẩu mới. Phải đang có phiên (mở từ link trong email đặt lại mật khẩu, hoặc đã đăng nhập). */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Link đặt lại mật khẩu đã hết hạn. Hãy gửi lại email quên mật khẩu." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Mật khẩu mới phải khác mật khẩu cũ" };
    if (error.code === "weak_password") return { error: "Mật khẩu quá yếu, hãy dùng mật khẩu khác" };
    return { error: "Không đổi được mật khẩu, thử lại sau" };
  }
  redirect("/play");
}

// =============================================================================
// ĐĂNG XUẤT
// =============================================================================

/** Đăng xuất trên thiết bị này rồi về trang chủ. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

/** Đăng xuất khỏi MỌI thiết bị (ví dụ nghi bị lộ mật khẩu) rồi về trang chủ. */
export async function signOutEverywhere(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}
