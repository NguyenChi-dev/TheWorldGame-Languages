import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { GET, POST } from "./route";
import { GET as GET_ONE } from "./[name]/route";
import { safeModelName } from "@/lib/project-models";

const ORIGIN = "http://localhost:3001";
let dir = "";

function glb(extra = 0) {
  const bytes = new Uint8Array(20 + extra);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  return bytes;
}
function upload(file: File, origin: string | null = ORIGIN) {
  const body = new FormData();
  body.set("file", file);
  return new Request(`${ORIGIN}/map-editor/models`, {
    method: "POST",
    body,
    headers: origin ? { origin } : {},
  });
}
const one = (name: string) =>
  GET_ONE(new Request(`${ORIGIN}/map-editor/models/${name}`), { params: Promise.resolve({ name }) });

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "lw-models-"));
  vi.stubEnv("LW_PROJECT_MODELS_DIR", dir);
  vi.stubEnv("NODE_ENV", "development");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("project models (dev only)", () => {
  it("saves a GLB into the models folder, lists it and serves it back", async () => {
    const response = await POST(upload(new File([glb(4)], "Nhà gỗ.glb")));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ name: "Nhà gỗ.glb", path: "apps/web/public/models/Nhà gỗ.glb" });
    expect(await readdir(dir)).toEqual(["Nhà gỗ.glb"]);
    expect((await readFile(path.join(dir, "Nhà gỗ.glb"))).length).toBe(24);
    expect(await (await GET()).json()).toEqual({ models: [{ name: "Nhà gỗ.glb", size: 24 }] });
    const file = await one(encodeURIComponent("Nhà gỗ.glb"));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("model/gltf-binary");
    expect((await file.arrayBuffer()).byteLength).toBe(24);
  });

  it("rejects invalid files, unsafe names and other origins", async () => {
    expect((await POST(upload(new File(["not a glb file at all!"], "a.glb")))).status).toBe(400);
    expect((await POST(upload(new File([glb()], "a.gltf")))).status).toBe(400);
    expect((await POST(upload(new File([glb()], "a.glb"), "https://evil.example"))).status).toBe(403);
    expect((await POST(upload(new File([glb()], "a.glb"), null))).status).toBe(403);
    expect(await readdir(dir)).toEqual([]);
    expect((await one("..%2F..%2Fpackage.json")).status).toBe(404);
    for (const name of ["../x.glb", "a/b.glb", "a\\b.glb", ".hidden.glb", "con:x.glb", "x.txt"])
      expect(safeModelName(name)).toBeNull();
  });

  it("is disabled outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET()).status).toBe(404);
    expect((await POST(upload(new File([glb()], "a.glb")))).status).toBe(404);
    expect((await one("a.glb")).status).toBe(404);
    expect(await readdir(dir)).toEqual([]);
  });
});
