import path from "node:path";
import type { NextConfig } from "next";

// Gốc monorepo. Khai báo rõ để Next không nhầm với file lock ở thư mục cha.
const monorepoRoot = path.join(__dirname, "../..");

/**
 * Chặn khởi động nếu lỡ đặt khóa bí mật vào biến NEXT_PUBLIC_*. Next nhúng mọi biến NEXT_PUBLIC_* vào JS
 * gửi cho trình duyệt (ai mở DevTools cũng đọc được), nên chúng chỉ được chứa giá trị công khai.
 */
function assertNoSecretInPublicEnv() {
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_") || !value) continue;
    let jwtRole: unknown = null;
    const parts = value.split(".");
    if (parts.length === 3) {
      try {
        jwtRole = JSON.parse(Buffer.from(parts[1], "base64url").toString()).role;
      } catch {
        jwtRole = null;
      }
    }
    const looksSecret =
      /SECRET|SERVICE|PRIVATE|PASSWORD/.test(name) ||
      value.startsWith("sb_secret_") ||
      jwtRole === "service_role" ||
      /^cloudinary:\/\/[^:]+:[^@]+@/.test(value) ||
      /^postgres(ql)?:\/\/[^:]+:[^@]+@/.test(value);
    if (looksSecret) {
      throw new Error(
        `[bảo mật] Biến ${name} có vẻ chứa khóa bí mật. Biến NEXT_PUBLIC_ bị gửi xuống trình duyệt: ` +
          "hãy bỏ tiền tố NEXT_PUBLIC_ (chỉ máy chủ đọc) hoặc chuyển khóa sang apps/api.",
      );
    }
  }
}
assertNoSecretInPublicEnv();

const nextConfig: NextConfig = {
  // Các gói nội bộ xuất thẳng mã TypeScript, Next sẽ tự biên dịch chúng.
  transpilePackages: ["@lw/assets", "@lw/game", "@lw/shared", "@lw/ui"],
  outputFileTracingRoot: monorepoRoot,
  // Ảnh bìa vùng đất nằm trên Cloudinary (đã thu nhỏ sẵn bằng tham số URL).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
