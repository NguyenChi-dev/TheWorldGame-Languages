import path from "node:path";
import type { NextConfig } from "next";

// Gốc monorepo. Khai báo rõ để Next không nhầm với file lock ở thư mục cha.
const monorepoRoot = path.join(__dirname, "../..");

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
