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

/** GLB files stay on this device. IndexedDB is a browser cache, not the Supabase database. */
async function database(scope: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${scope}:models`, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "source" });
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
