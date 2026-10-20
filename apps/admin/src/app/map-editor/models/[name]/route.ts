import { projectModelsEnabled, readProjectModel } from "@/lib/project-models";

/** Dev-only: tải một file GLB đã lưu trong `apps/web/public/models/` để editor mở lại ở trình duyệt khác. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!projectModelsEnabled()) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  const { name } = await params;
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // Next đã giải mã sẵn và tên chứa "%": dùng nguyên tên.
  }
  const bytes = await readProjectModel(decoded);
  if (!bytes) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "model/gltf-binary", "cache-control": "no-store" },
  });
}
