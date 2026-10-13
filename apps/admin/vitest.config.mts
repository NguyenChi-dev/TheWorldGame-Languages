import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Test không bao giờ gọi Supabase thật: client Supabase luôn được thay bằng bản giả trong từng test.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      // Cloudinary GIẢ: test không bao giờ gọi vào tài khoản thật.
      CLOUDINARY_URL: "cloudinary://123456789:test-secret-khong-that@test-cloud",
      CLOUDINARY_FOLDER: "",
    },
  },
});
