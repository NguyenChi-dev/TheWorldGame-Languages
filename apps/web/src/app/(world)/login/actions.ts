"use server";

/**
 * Đăng nhập / tạo tài khoản người chơi (Supabase Auth, bằng khóa publishable, không dùng khóa bí mật).
 * Tài khoản mới luôn có vai trò 'player' (trigger handle_new_user trong database), username lấy từ
 * metadata. Đăng nhập xong vào thẳng game (/play).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Tên nhân vật: 3–32 chữ (có dấu), số, dấu _ . - */
const USERNAME = /^[\p{L}\p{N}_.-]{3,32}$/u;
const MIN_PASSWORD = 8;

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { values: { email }, error: "Nhập email và mật khẩu" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return { values: { email }, error: "Email chưa được xác nhận. Hãy bấm link trong email trước" };
    return { values: { email }, error: "Email hoặc mật khẩu không đúng" };
  }
  redirect("/play");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const values = { email, username };

  if (!USERNAME.test(username)) return { values, error: "Tên nhân vật gồm 3–32 chữ, số, dấu _ . -" };
  if (!EMAIL.test(email)) return { values, error: "Email không hợp lệ" };
  if (password.length < MIN_PASSWORD) return { values, error: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` };
  if (password !== confirm) return { values, error: "Mật khẩu nhập lại không khớp" };

  // Next đã kiểm tra Origin khớp Host cho server action, nên dùng được để tạo link xác nhận email.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Chỉ gửi username. Vai trò KHÔNG lấy từ đây (database luôn đặt 'player').
    options: { data: { username }, emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    if (error.code === "user_already_exists")
      return { values, error: "Email này đã có tài khoản, hãy đăng nhập" };
    if (error.code === "weak_password") return { values, error: "Mật khẩu quá yếu, hãy dùng mật khẩu khác" };
    if (error.code === "over_email_send_rate_limit")
      return { values, error: "Gửi email quá nhiều lần, thử lại sau ít phút" };
    if (error.code === "signup_disabled") return { values, error: "Hệ thống đang tắt đăng ký" };
    return { values, error: "Không tạo được tài khoản, thử lại sau" };
  }

  // Dự án tắt xác nhận email thì đã đăng nhập luôn: vào game.
  if (data.session) redirect("/play");
  return { message: `Đã gửi email xác nhận tới ${email}. Bấm link trong email để vào game.` };
}

/** Đăng xuất (chỉ phiên trên thiết bị này) rồi về trang chủ. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
