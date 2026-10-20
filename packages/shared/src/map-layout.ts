/** Portable map format. Positions use metres, Y points up; rotations are Euler angles in DEGREES. */
import { z } from "zod";

export const MAX_MAP_OBJECTS = 500;
export const MAX_LAYOUT_BYTES = 2 * 1024 * 1024;
export const MAX_GLB_BYTES = 50 * 1024 * 1024;
export const SPAWN_ID = "@spawn";

const coordinate = z.number().finite().min(-10000).max(10000);
export const MapVector = z.strictObject({ x: coordinate, y: coordinate, z: coordinate });
export type MapVector = z.infer<typeof MapVector>;
const scale = z.number().finite().min(0.01).max(1000);
const color = z.string().regex(/^#[\da-f]{6}$/i, "Màu phải có dạng #rrggbb");

/** Export stable project paths, never a browser blob URL or a filesystem path. */
export function isModelPath(value: string): boolean {
  if (!value.startsWith("/models/") || !value.toLowerCase().endsWith(".glb")) return false;
  try {
    const parts = value.slice(8).split("/").map(decodeURIComponent);
    return parts.every(
      (part) =>
        part &&
        part !== "." &&
        part !== ".." &&
        !/[\\/?#:]/.test(part) &&
        !Array.from(part).some((character) => character.charCodeAt(0) < 32),
    );
  } catch {
    return false;
  }
}

const common = {
  id: z
    .string()
    .min(1)
    .max(100)
    .refine((id) => id !== SPAWN_ID, "ID này dành cho điểm xuất hiện"),
  name: z.string().trim().min(1).max(100),
  position: MapVector,
  rotation: MapVector,
  scale: z.strictObject({ x: scale, y: scale, z: scale }),
  visible: z.boolean(),
  locked: z.boolean(),
};

export const MapObject = z.discriminatedUnion("kind", [
  z.strictObject({
    ...common,
    kind: z.literal("glb"),
    source: z.string().max(500).refine(isModelPath, "Đường dẫn phải là /models/ten-file.glb"),
  }),
  z.strictObject({ ...common, kind: z.enum(["box", "cylinder", "sphere"]), color }),
]);
export type MapObject = z.infer<typeof MapObject>;
export type PrimitiveKind = Exclude<MapObject["kind"], "glb">;

export const MapLayout = z.strictObject({
  format: z.literal("language-world-map"),
  version: z.literal(1),
  name: z.string().trim().min(1).max(100),
  ground: z.strictObject({
    width: z.number().finite().min(4).max(512),
    depth: z.number().finite().min(4).max(512),
    color,
  }),
  spawn: MapVector,
  objects: z
    .array(MapObject)
    .max(MAX_MAP_OBJECTS)
    .refine(
      (objects) => new Set(objects.map((object) => object.id)).size === objects.length,
      "Các vật thể không được trùng ID",
    ),
});
export type MapLayout = z.infer<typeof MapLayout>;

export function emptyMap(): MapLayout {
  return {
    format: "language-world-map",
    version: 1,
    name: "Thế giới của tôi",
    ground: { width: 48, depth: 48, color: "#7f9c83" },
    spawn: { x: 0, y: 0, z: 0 },
    objects: [],
  };
}

export function readMapJson(text: string): MapLayout {
  if (new TextEncoder().encode(text).byteLength > MAX_LAYOUT_BYTES) throw new Error("File JSON tối đa 2 MB");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("File không phải JSON hợp lệ");
  }
  const result = MapLayout.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Bố cục không hợp lệ (${issue.path.join(".") || "format"}): ${issue.message}`);
  }
  return result.data;
}

export function writeMapJson(layout: MapLayout): string {
  return JSON.stringify(MapLayout.parse(layout), null, 2) + "\n";
}

export function modelPath(filename: string): string {
  const source = `/models/${encodeURIComponent(filename)}`;
  if (!isModelPath(source)) throw new Error("Hãy chọn file có đuôi .glb và tên file hợp lệ");
  return source;
}
