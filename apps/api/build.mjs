// Đóng gói máy chủ API thành dist/index.js để chạy bằng "node dist/index.js".
// Gói nội bộ @lw/* (mã TypeScript) được gộp vào file kết quả;
// các thư viện khác trong node_modules giữ nguyên, Node sẽ tự nạp khi chạy.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  plugins: [
    {
      name: "externalize-node-modules",
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, (args) =>
          args.path.startsWith("@lw/") ? undefined : { path: args.path, external: true },
        );
      },
    },
  ],
});

console.log("Đã build xong apps/api/dist/index.js");
