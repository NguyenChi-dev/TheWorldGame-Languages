import { describe, expect, it } from "vitest";
import {
  emptyMap,
  MapLayout,
  modelPath,
  readMapJson,
  SPAWN_ID,
  writeMapJson,
  type MapObject,
} from "@lw/shared/map-layout";
import { createEditorStore } from "./editor-store";

const box = (): Extract<MapObject, { color: string }> => ({
  id: "box-1",
  name: "Bàn",
  kind: "box",
  color: "#aabbcc",
  position: { x: 1, y: 2, z: 3 },
  rotation: { x: 0, y: 90, z: 0 },
  scale: { x: 2, y: 1, z: 3 },
  visible: true,
  locked: false,
});

describe("portable map files", () => {
  it("round trips heights, rotations, scales, spawn, hidden/locked flags and GLB paths", () => {
    const layout = {
      ...emptyMap(),
      spawn: { x: 1, y: 4, z: -2 },
      objects: [
        box(),
        {
          ...box(),
          id: "glb-1",
          kind: "glb" as const,
          source: "/models/nha.glb",
          color: undefined,
          visible: false,
          locked: true,
        },
      ],
    };
    // A GLB has no primitive colour field; unknown fields are rejected instead of silently lost.
    const { color: _, ...glb } = layout.objects[1];
    void _;
    const parsed = MapLayout.parse({ ...layout, objects: [box(), glb] });
    expect(readMapJson(writeMapJson(parsed))).toEqual(parsed);
  });
  it("rejects corrupt files, future versions and duplicate identifiers without replacing the draft", () => {
    const store = createEditorStore();
    store.add([box()]);
    const before = store.getSnapshot();
    expect(() => readMapJson("{broken")).toThrow();
    expect(() => readMapJson(JSON.stringify({ ...emptyMap(), version: 2 }))).toThrow();
    expect(() => store.commit({ ...emptyMap(), objects: [box(), box()] })).toThrow();
    expect(store.getSnapshot()).toBe(before);
  });
  it.each([
    "blob:temporary",
    "https://example.com/model.glb",
    "/models/../private.glb",
    "/models/%2e%2e/private.glb",
    "/models/sub%2F..%2Fsecret.glb",
    "/models/a.glb?x=1",
  ])("rejects unsafe/nonportable model reference %s", (source) => {
    const { color: _, ...object } = box();
    void _;
    expect(
      MapLayout.safeParse({ ...emptyMap(), objects: [{ ...object, kind: "glb", source }] }).success,
    ).toBe(false);
  });
  it("accepts unicode file names and nested /models paths", () => {
    expect(modelPath("nhà đẹp.glb")).toBe("/models/nh%C3%A0%20%C4%91%E1%BA%B9p.glb");
    const { color: _, ...object } = box();
    void _;
    expect(
      MapLayout.safeParse({
        ...emptyMap(),
        objects: [{ ...object, kind: "glb", source: "/models/town/tree.glb" }],
      }).success,
    ).toBe(true);
  });
  it("rejects nonfinite coordinates, zero/negative scale and reserved IDs", () => {
    for (const change of [
      { scale: { x: 0, y: 1, z: 1 } },
      { position: { x: Infinity, y: 0, z: 0 } },
      { id: SPAWN_ID },
    ]) {
      expect(MapLayout.safeParse({ ...emptyMap(), objects: [{ ...box(), ...change }] }).success).toBe(false);
    }
  });
});

describe("editing history", () => {
  it("undoes a drag in one step and restores a deleted object with its previous transform", () => {
    const store = createEditorStore();
    store.add([box()]);
    store.transform("box-1", { ...box(), position: { x: 10, y: 7, z: 20 } });
    store.remove();
    expect(store.getSnapshot().layout.objects).toHaveLength(0);
    store.undo();
    expect(store.getSnapshot().layout.objects[0].position.y).toBe(7);
    store.undo();
    expect(store.getSnapshot().layout.objects[0]).toEqual(box());
    store.redo();
    expect(store.getSnapshot().layout.objects[0].position.y).toBe(7);
  });
  it("does not delete a locked object; duplicates have independent IDs/transforms", () => {
    const store = createEditorStore();
    store.add([{ ...box(), locked: true }]);
    store.remove();
    expect(store.getSnapshot().layout.objects).toHaveLength(1);
    store.duplicate();
    const [original, duplicate] = store.getSnapshot().layout.objects;
    expect(original.id).not.toBe(duplicate.id);
    expect(duplicate.locked).toBe(false);
    expect(original.position).toEqual(box().position);
    store.remove();
    expect(store.getSnapshot().layout.objects).toHaveLength(1);
  });
  it("allows overlapping objects at different heights and keeps spawn undoable", () => {
    const store = createEditorStore();
    store.add([box(), { ...box(), id: "box-2", position: { ...box().position, y: 3 } }]);
    store.transform(SPAWN_ID, { ...box(), position: { x: 10, y: 2, z: 5 } });
    expect(store.getSnapshot().layout.spawn.y).toBe(2);
    store.undo();
    expect(store.getSnapshot().layout.spawn).toEqual(emptyMap().spawn);
    expect(store.getSnapshot().layout.objects).toHaveLength(2);
  });
  it("new edits after undo discard redo; no-op edits and selections do not consume history", () => {
    const store = createEditorStore();
    store.add([box()]);
    store.select(null);
    store.commit(store.getSnapshot().layout);
    expect(store.getSnapshot().past).toHaveLength(1);
    store.undo();
    store.commit({ ...emptyMap(), name: "Bản khác" });
    expect(store.getSnapshot().future).toHaveLength(0);
  });
});
