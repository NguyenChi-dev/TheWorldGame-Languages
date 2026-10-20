import "server-only";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_GLB_BYTES } from "@lw/shared/map-layout";

/**
 * Lưu file GLB của World Studio vào thư mục dự án `apps/web/public/models/` để game đọc được ở `/models/<tên>.glb`.
 *
 * CHỈ dùng khi chạy dev trên máy lập trình: production không có ổ đĩa ghi được và không cho ai ghi vào source.
 * Mọi route gọi tới đây phải kiểm tra `projectModelsEnabled()` trước.
 */
export const projectModelsEnabled = () => process.env.NODE_ENV === "development";

/** `next dev` của admin chạy trong apps/admin → ../web/public/models. Test dùng thư mục tạm qua biến môi trường. */
export const projectModelsDir = () =>
  process.env.LW_PROJECT_MODELS_DIR ?? path.resolve(process.cwd(), "../web/public/models");

/** Tên file an toàn: chỉ một tên (không thư mục, không ".."), đuôi .glb, không ký tự Windows cấm. */
export function safeModelName(name: string): string | null {
  if (name.length > 120 || name !== path.basename(name) || name.startsWith(".")) return null;
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(name) || !/\.glb$/i.test(name)) return null;
  return name;
}

export function isGlb(bytes: Uint8Array): boolean {
  if (bytes.length < 20) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return (
    view.getUint32(0, true) === 0x46546c67 &&
    view.getUint32(4, true) === 2 &&
    view.getUint32(8, true) === bytes.length
  );
}

export async function listProjectModels(): Promise<{ name: string; size: number }[]> {
  const dir = projectModelsDir();
  const names = await readdir(dir).catch(() => [] as string[]);
  const files = await Promise.all(
    names
      .filter((name) => safeModelName(name))
      .map(async (name) => ({ name, size: (await stat(path.join(dir, name))).size })),
  );
  return files.filter((file) => file.size > 0 && file.size <= MAX_GLB_BYTES);
}

export async function readProjectModel(name: string): Promise<Buffer | null> {
  const safe = safeModelName(name);
  if (!safe) return null;
  return readFile(path.join(projectModelsDir(), safe)).catch(() => null);
}

/** Ghi qua file tạm rồi đổi tên, để game không bao giờ đọc phải file ghi dở. */
export async function writeProjectModel(name: string, bytes: Uint8Array): Promise<void> {
  const dir = projectModelsDir();
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, name);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, bytes);
  await rename(temp, target);
}
