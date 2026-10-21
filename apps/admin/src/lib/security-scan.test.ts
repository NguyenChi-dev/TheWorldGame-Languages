/**
 * Quét mã nguồn: khóa bí mật không bao giờ tới trình duyệt.
 * - Biến NEXT_PUBLIC_* (Next nhúng vào JS gửi cho trình duyệt) không được mang tên bí mật.
 * - File chạy trên trình duyệt ("use client", và các package dùng chung) chỉ đọc NEXT_PUBLIC_* / NODE_ENV
 *   và không import module chỉ-máy-chủ (client Supabase máy chủ, Cloudinary, gọi API kèm token...).
 * - Khóa service_role chỉ xuất hiện ở apps/api (máy chủ API). Trang admin / game dùng khóa publishable + RLS.
 * - Không commit file .env thật (chỉ .env.example, và .example không chứa giá trị khóa thật).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");
const SOURCE = /\.(ts|tsx|mts|cts|js|mjs)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE.test(name) && !/\.test\.|\.spec\./.test(name)) out.push(full);
  }
  return out;
}

const rel = (file: string) => path.relative(ROOT, file).replaceAll("\\", "/");
const files = ["apps/admin/src", "apps/web/src", "apps/api/src", "apps/realtime/src", "packages"]
  .map((dir) => path.join(ROOT, dir))
  .filter((dir) => fs.existsSync(dir))
  .flatMap((dir) => walk(dir));
const read = (file: string) => fs.readFileSync(file, "utf8");
const isClient = (file: string, text: string) =>
  /^\s*["']use client["']/.test(text) || rel(file).startsWith("packages/");

/**
 * Module chỉ được dùng ở máy chủ (đọc cookie phiên / khóa bí mật / gọi API kèm token), theo từng app.
 * (apps/web/src/lib/api.ts là bản cho trình duyệt nên không nằm trong danh sách của web.)
 * "import type" bị xóa khi biên dịch, không mang mã máy chủ theo, nên được phép.
 */
const SERVER_ONLY_IMPORTS: Record<string, string[]> = {
  "apps/admin/": [
    "@/lib/supabase/server",
    "@/lib/cloudinary",
    "@/lib/api",
    "@/lib/auth",
    "@/lib/audit",
    "@/lib/project-models",
  ],
  "apps/web/": ["@/lib/supabase/server", "@/lib/player", "@/lib/update-me", "@/lib/server-api-url"],
};

describe("không đưa khóa bí mật lên trình duyệt", () => {
  it("quét đủ mã nguồn", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("không có biến NEXT_PUBLIC_* mang tên bí mật", () => {
    const bad = files.flatMap((file) =>
      [...read(file).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)]
        .map((m) => m[0])
        .filter((name) => /SECRET|SERVICE|PRIVATE|PASSWORD|CLOUDINARY_URL|DATABASE/.test(name))
        .map((name) => `${rel(file)}: ${name}`),
    );
    expect(bad).toEqual([]);
  });

  it("file chạy trên trình duyệt chỉ đọc NEXT_PUBLIC_* / NODE_ENV", () => {
    const bad = files.flatMap((file) => {
      const text = read(file);
      if (!isClient(file, text)) return [];
      return [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)]
        .map((m) => m[1])
        .filter((name) => !name.startsWith("NEXT_PUBLIC_") && name !== "NODE_ENV")
        .map((name) => `${rel(file)}: process.env.${name}`);
    });
    expect(bad).toEqual([]);
  });

  it('file "use client" không import module chỉ-máy-chủ', () => {
    const bad = files.flatMap((file) => {
      const text = read(file);
      if (!/^\s*["']use client["']/.test(text)) return [];
      const app = Object.keys(SERVER_ONLY_IMPORTS).find((prefix) => rel(file).startsWith(prefix));
      if (!app) return [];
      // Bỏ các dòng "import type ..." (không có mã chạy).
      const code = text.replace(/^import type [^;]+;/gm, "");
      return SERVER_ONLY_IMPORTS[app]
        .filter((mod) => new RegExp(`from ["']${mod}["']`).test(code))
        .map((mod) => `${rel(file)} → ${mod}`);
    });
    expect(bad).toEqual([]);
  });

  it("khóa service_role chỉ dùng ở apps/api", () => {
    const bad = files
      // Tên biến môi trường của khóa (bỏ qua chú thích chỉ nhắc tới chữ "service_role").
      .filter((file) => /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/.test(read(file)))
      .map(rel)
      .filter((file) => !file.startsWith("apps/api/"));
    expect(bad).toEqual([]);
  });

  it('module máy chủ của admin có import "server-only" (build báo lỗi nếu lỡ dùng ở trình duyệt)', () => {
    for (const mod of [
      "supabase/server.ts",
      "cloudinary.ts",
      "api.ts",
      "auth.ts",
      "audit.ts",
      "project-models.ts",
    ]) {
      expect(read(path.join(ROOT, "apps/admin/src/lib", mod)), mod).toMatch(/^import "server-only";/m);
    }
  });

  it("không commit file .env thật; .env.example không chứa khóa thật", () => {
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).split("\n");
    const envFiles = tracked.filter((file) => /(^|\/)\.env(\.|$)/.test(file));
    expect(envFiles.filter((file) => !file.endsWith(".env.example"))).toEqual([]);
    for (const file of envFiles) {
      const text = read(path.join(ROOT, file));
      // JWT (eyJ...), khóa mới của Supabase (sb_secret_...), chuỗi Cloudinary có mật khẩu thật.
      expect(text, file).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
      expect(text, file).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
      expect(text, file).not.toMatch(/cloudinary:\/\/\d{6,}:[A-Za-z0-9_-]{15,}@/);
    }
  });
});
