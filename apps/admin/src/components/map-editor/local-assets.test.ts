import { describe, expect, it } from "vitest";
import { emptyMap, type MapObject } from "@lw/shared/map-layout";
import { inspectGlb, resolveModelSource } from "./local-assets";

function glb(name = "tree.glb", version = 2) {
  const bytes = new ArrayBuffer(20);
  const header = new DataView(bytes);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, version, true);
  header.setUint32(8, bytes.byteLength, true);
  return new File([bytes], name);
}

function model(source: string): MapObject {
  return {
    id: source,
    name: "Tree",
    kind: "glb",
    source,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    visible: true,
    locked: false,
  };
}

describe("local GLB files", () => {
  it("validates the binary header and produces a portable encoded source", async () => {
    const file = glb("cây xanh.glb");
    const asset = await inspectGlb(file);
    expect(asset).toEqual({ source: "/models/c%C3%A2y%20xanh.glb", file });
  });

  it("rejects renamed non-GLB files, old versions and truncated binaries", async () => {
    await expect(inspectGlb(new File(["not a model"], "tree.glb"))).rejects.toThrow();
    await expect(inspectGlb(glb("tree.glb", 1))).rejects.toThrow();
    await expect(inspectGlb(new File([await glb().arrayBuffer(), "extra"], "tree.glb"))).rejects.toThrow();
    await expect(inspectGlb(glb("tree.gltf"))).rejects.toThrow();
  });

  it("reconnects a nested JSON source using the original filename", async () => {
    const asset = await inspectGlb(glb());
    const layout = { ...emptyMap(), objects: [model("/models/town/tree.glb")] };
    expect(resolveModelSource(asset, layout)).toBe("/models/town/tree.glb");
    expect(resolveModelSource(asset, emptyMap())).toBe("/models/tree.glb");
  });

  it("does not silently choose between two folders with the same basename", async () => {
    const asset = await inspectGlb(glb());
    const layout = { ...emptyMap(), objects: [model("/models/a/tree.glb"), model("/models/b/tree.glb")] };
    expect(() => resolveModelSource(asset, layout)).toThrow("trùng tên");
    layout.objects.push(model(asset.source));
    expect(resolveModelSource(asset, layout)).toBe(asset.source);
  });
});
