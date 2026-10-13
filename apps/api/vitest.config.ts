import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Test không bao giờ gọi Supabase thật, kể cả khi máy bạn đã có file .env.
    // (Biến đã đặt ở đây được ưu tiên hơn giá trị trong .env.)
    env: {
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      CORS_ORIGINS: "http://localhost:3000,http://localhost:3001",
    },
  },
});
