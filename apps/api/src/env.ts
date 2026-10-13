/**
 * Đọc và kiểm tra biến môi trường MỘT lần khi máy chủ khởi động.
 * Nơi khác trong code chỉ dùng `env` ở đây, không đọc process.env trực tiếp.
 */
import { z } from "zod";

// Nạp file apps/api/.env nếu có (Node 22 có sẵn hàm này, không cần thư viện dotenv).
// Biến đã đặt sẵn trong hệ thống (ví dụ trên máy chủ thật) được ưu tiên hơn file.
try {
  process.loadEnvFile(".env");
} catch {
  // Không có file .env: dùng biến hệ thống và giá trị mặc định.
}

/** File .env.example để trống giá trị ("SUPABASE_URL="), coi chuỗi rỗng là "chưa đặt". */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const EnvSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(4000)),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.url({ protocol: /^https?$/ }).optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  // Bật Swagger UI ở /api-docs và tài liệu ở /openapi.json. Đặt "false" để tắt.
  API_DOCS: z
    .preprocess(emptyToUndefined, z.enum(["true", "false"]).default("true"))
    .transform((value) => value === "true"),
  CORS_ORIGINS: z
    .preprocess(emptyToUndefined, z.string().default("http://localhost:3000,http://localhost:3001"))
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    // Giá trị SAI định dạng (khác với THIẾU) là lỗi cấu hình: dừng ngay và nói rõ biến nào sai.
    console.error("❌ Biến môi trường của apps/api không hợp lệ:");
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

/** true khi đã có đủ URL và khóa bí mật để gọi Supabase. */
export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
