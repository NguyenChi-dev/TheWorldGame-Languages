import { MAX_GLB_BYTES } from "@lw/shared/map-layout";
import {
  isGlb,
  listProjectModels,
  projectModelsEnabled,
  safeModelName,
  writeProjectModel,
} from "@/lib/project-models";

/**
 * Dev-only: danh sách / lưu file GLB của World Studio trong `apps/web/public/models/`.
 * Ngoài development luôn trả 404 (production không ghi vào source dự án).
 */
const notFound = () => Response.json({ error: "Không tìm thấy" }, { status: 404 });

export async function GET() {
  if (!projectModelsEnabled()) return notFound();
  return Response.json({ models: await listProjectModels() });
}

export async function POST(request: Request) {
  if (!projectModelsEnabled()) return notFound();
  // Chặn trang web lạ gửi file vào localhost: chỉ nhận yêu cầu từ chính trang admin.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_GLB_BYTES + 64 * 1024)
    return Response.json({ error: "File GLB tối đa 50 MB" }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Thiếu file GLB" }, { status: 400 });
  const name = safeModelName(file.name);
  if (!name) return Response.json({ error: "Tên file không hợp lệ (cần đuôi .glb)" }, { status: 400 });
  if (file.size > MAX_GLB_BYTES) return Response.json({ error: "File GLB tối đa 50 MB" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isGlb(bytes)) return Response.json({ error: "Cần file GLB 2.0 hợp lệ" }, { status: 400 });

  await writeProjectModel(name, bytes);
  return Response.json({ name, path: `apps/web/public/models/${name}` }, { status: 201 });
}
