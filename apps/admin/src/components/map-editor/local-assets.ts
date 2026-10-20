import { MAX_GLB_BYTES, modelPath, type MapLayout } from "@lw/shared/map-layout";

export interface LocalModel {
  source: string;
  file: File;
}

/** A file picker omits folders; reconnect an imported project path only when unambiguous. */
export function resolveModelSource(asset: LocalModel, layout: MapLayout): string {
  const sources = new Set(layout.objects.flatMap((object) => (object.kind === "glb" ? [object.source] : [])));
  if (sources.has(asset.source)) return asset.source;
  const matches = [...sources].filter(
    (source) => decodeURIComponent(source.split("/").at(-1)!) === asset.file.name,
  );
  if (matches.length > 1)
    throw new Error(`${asset.file.name}: nhiều đường dẫn trùng tên trong JSON. Hãy dùng tên GLB riêng biệt.`);
  return matches[0] ?? asset.source;
}

/** Tên mô hình người dùng đặt khi import → lỗi (chuỗi) hoặc null nếu hợp lệ. Tên này thành tên file `<tên>.glb`. */
export function modelNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Hãy đặt tên cho mô hình";
  if (trimmed.length > 100) return "Tên tối đa 100 ký tự";
  if (trimmed.startsWith(".")) return "Tên không được bắt đầu bằng dấu chấm";
  // Ký tự Windows cấm trong tên file + ký tự đặc biệt của URL.
  if (/[\\/:*?"<>|#%\u0000-\u001f]/.test(trimmed)) return 'Tên không được chứa \\ / : * ? " < > | # %';
  return null;
}

/** GLB files stay on this device. IndexedDB is a browser cache, not the Supabase database. */
async function database(scope: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${scope}:models`, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "source" });
      // v2: ảnh minh họa PNG của từng mô hình (key = đường dẫn + dung lượng file).
      if (!db.objectStoreNames.contains("thumbs")) db.createObjectStore("thumbs");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Bộ nhớ đang được một tab khác sử dụng"));
  });
}

export async function restoreModels(scope: string): Promise<LocalModel[]> {
  const db = await database(scope);
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("files", "readonly").objectStore("files").getAll();
      request.onsuccess = () => resolve(request.result as LocalModel[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveModel(scope: string, model: LocalModel): Promise<void> {
  const db = await database(scope);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      transaction.objectStore("files").put(model);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

const thumbKey = (model: LocalModel) => `${model.source}|${model.file.size}`;

export async function loadThumbnail(scope: string, model: LocalModel): Promise<Blob | null> {
  const db = await database(scope);
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("thumbs", "readonly").objectStore("thumbs").get(thumbKey(model));
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveThumbnail(scope: string, model: LocalModel, image: Blob): Promise<void> {
  const db = await database(scope);
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("thumbs", "readwrite");
      transaction.objectStore("thumbs").put(image, thumbKey(model));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Dev: ghi GLB vào apps/web/public/models/ qua route của admin. Trả về đường dẫn trong dự án. */
export async function saveProjectModel(file: File): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/map-editor/models", { method: "POST", body });
  const result = (await response.json().catch(() => ({}))) as { path?: string; error?: string };
  if (!response.ok || !result.path) throw new Error(result.error ?? `Lỗi ${response.status}`);
  return result.path;
}

/** Dev: mọi GLB đã lưu trong dự án (để mở được ở trình duyệt / hồ sơ Chrome khác). File lỗi thì bỏ qua. */
export async function restoreProjectModels(skip: ReadonlySet<string>): Promise<LocalModel[]> {
  const response = await fetch("/map-editor/models", { cache: "no-store" });
  if (!response.ok) throw new Error(`Lỗi ${response.status}`);
  const { models } = (await response.json()) as { models: { name: string }[] };
  const files = await Promise.all(
    models.map(async ({ name }) => {
      try {
        const source = modelPath(name);
        if (skip.has(source)) return null;
        const file = await fetch(`/map-editor/models/${encodeURIComponent(name)}`, { cache: "no-store" });
        if (!file.ok) return null;
        return { source, file: new File([await file.blob()], name, { type: "model/gltf-binary" }) };
      } catch {
        return null;
      }
    }),
  );
  return files.filter((file): file is LocalModel => !!file);
}

export async function inspectGlb(file: File): Promise<LocalModel> {
  const source = modelPath(file.name);
  if (file.size > MAX_GLB_BYTES) throw new Error(`${file.name}: file GLB tối đa 50 MB`);
  if (file.size < 20) throw new Error(`${file.name}: file GLB không hợp lệ`);
  const header = new DataView(await file.slice(0, 12).arrayBuffer());
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== file.size
  ) {
    throw new Error(`${file.name}: cần file GLB 2.0 hợp lệ`);
  }
  return { source, file };
}
