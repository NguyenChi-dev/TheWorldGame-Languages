import path from "node:path";
import type { NextConfig } from "next";

// Gốc monorepo. Khai báo rõ để Next không nhầm với file lock ở thư mục cha.
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Các gói nội bộ xuất thẳng mã TypeScript, Next sẽ tự biên dịch chúng.
  transpilePackages: ["@lw/assets", "@lw/game", "@lw/shared", "@lw/ui"],
  outputFileTracingRoot: monorepoRoot,
  // Cho phép next/image hiển thị ảnh lưu trên Cloudinary.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Bài học không còn là mục riêng: được mở từ bên trong khu vực (/lands/[landId]/areas/[areaId]).
  async redirects() {
    return [
      { source: "/lessons", destination: "/lands", permanent: false },
      { source: "/lessons/:path*", destination: "/lands", permanent: false },
    ];
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
