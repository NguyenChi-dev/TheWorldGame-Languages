/**
 * Kiểm tra form đăng nhập / đăng ký bằng Zod. Dùng chung cho trình duyệt (báo lỗi ngay, không gửi
 * request khi form sai) và server action (kiểm tra lại: dữ liệu từ trình duyệt không đáng tin).
 *
 * Chính sách mật khẩu: 8–72 ký tự, có cả chữ và số. Chặt hơn cấu hình Supabase
 * (supabase/config.toml: minimum_password_length = 6), nên mật khẩu qua được đây luôn qua được Supabase.
 * 72 là giới hạn của bcrypt mà Supabase dùng để băm mật khẩu.
 */
import { z } from "zod";
import { USERNAME_PATTERN, USERNAME_RULE } from "@lw/shared";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

const Email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Nhập email")
  .max(254, "Email quá dài")
  .pipe(z.email("Email không đúng định dạng"));

export const NewPassword = z
  .string()
  .min(1, "Nhập mật khẩu")
  .min(PASSWORD_MIN, `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự`)
  .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), "Mật khẩu cần có cả chữ và số");

export const SignInInput = z.object({
  email: Email,
  password: z.string().min(1, "Nhập mật khẩu").max(PASSWORD_MAX, "Email hoặc mật khẩu không đúng"),
});

export const SignUpInput = z
  .object({
    email: Email,
    // NFC: chữ có dấu luôn ở dạng dựng sẵn (1 ký tự), khớp kiểm tra của database.
    username: z.string().trim().normalize("NFC").regex(USERNAME_PATTERN, USERNAME_RULE),
    password: NewPassword,
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại không khớp",
  });

export type FieldErrors = Record<string, string>;

/** Lỗi đầu tiên của mỗi trường, theo tên trường trong form. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Đọc các trường `keys` từ FormData rồi kiểm tra bằng `schema`. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData, keys: readonly string[]) {
  return schema.safeParse(Object.fromEntries(keys.map((key) => [key, text(formData.get(key))])));
}

/** Lỗi của Supabase khi đăng nhập → thông báo tiếng Việt. Không bao giờ cho biết email có tồn tại hay không. */
export function signInErrorMessage(error: { code?: string; status?: number; name?: string }): string {
  if (error.name === "AuthRetryableFetchError" || error.status === 0)
    return "Không kết nối được máy chủ xác thực. Kiểm tra mạng rồi thử lại.";
  switch (error.code) {
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng";
    // Supabase chỉ trả 2 mã này khi mật khẩu ĐÚNG, nên không lộ thêm thông tin cho người đoán mò.
    case "email_not_confirmed":
      return "Email chưa được xác nhận. Hãy bấm link trong email xác nhận rồi đăng nhập lại.";
    case "user_banned":
      return "Tài khoản đã bị khóa. Hãy liên hệ quản trị viên.";
    case "over_request_rate_limit":
      return "Thử đăng nhập quá nhiều lần. Hãy đợi vài phút rồi thử lại.";
  }
  if ((error.status ?? 0) >= 500) return "Hệ thống xác thực đang gặp sự cố, thử lại sau ít phút.";
  return "Email hoặc mật khẩu không đúng";
}

/** Lỗi khi xác minh mã TOTP → thông báo tiếng Việt. */
export function totpErrorMessage(error: { code?: string; status?: number; name?: string }): string {
  if (error.name === "AuthRetryableFetchError" || error.status === 0)
    return "Không kết nối được máy chủ xác thực. Kiểm tra mạng rồi thử lại.";
  switch (error.code) {
    case "mfa_verification_failed":
    case "invalid_credentials":
      return "Mã không đúng. Kiểm tra giờ trên điện thoại đã tự động đồng bộ chưa, rồi nhập mã đang hiện.";
    case "mfa_challenge_expired":
      return "Mã đã hết hạn (mỗi mã chỉ dùng trong 30 giây). Nhập mã mới đang hiện trong ứng dụng.";
    case "mfa_factor_not_found":
      return "Không tìm thấy thiết bị xác thực. Tải lại trang để thiết lập lại.";
    case "mfa_verification_rejected":
    case "over_request_rate_limit":
      return "Nhập sai quá nhiều lần. Hãy đợi vài phút rồi thử lại.";
  }
  if ((error.status ?? 0) >= 500) return "Hệ thống xác thực đang gặp sự cố, thử lại sau ít phút.";
  return "Mã không đúng hoặc đã hết hạn";
}

export const SIGN_IN_FIELDS = ["email", "password"] as const;
export const SIGN_UP_FIELDS = ["email", "username", "password", "confirmPassword"] as const;
