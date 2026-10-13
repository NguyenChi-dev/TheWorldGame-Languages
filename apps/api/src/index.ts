/**
 * Khởi động máy chủ apps/api (Hono trên Node.js), mặc định ở cổng 4000.
 * CORS và các route được gắn trong app.ts.
 */
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env, isSupabaseConfigured } from "./env.js";

if (!isSupabaseConfigured) {
  console.warn(
    [
      "⚠️  Chưa cấu hình Supabase (thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong apps/api/.env).",
      "   Máy chủ vẫn chạy: /health và /catalog dùng được,",
      '   các route cần đăng nhập sẽ trả 503 "Chưa cấu hình Supabase".',
    ].join("\n"),
  );
}

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`✅ apps/api đang chạy tại http://localhost:${info.port}`);
  console.log(`   Cho phép gọi từ: ${env.CORS_ORIGINS.join(", ")}`);
});

// Tắt gọn gàng khi nhấn Ctrl+C hoặc khi tsx khởi động lại do sửa code.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
