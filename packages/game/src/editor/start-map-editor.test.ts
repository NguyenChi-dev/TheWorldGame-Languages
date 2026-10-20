import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArcRotateCamera, GizmoManager, NullEngine, ShaderMaterial } from "@babylonjs/core";
import { emptyMap, type MapObject } from "@lw/shared/map-layout";

const runtime = vi.hoisted(() => ({
  engine: null as NullEngine | null,
  gizmos: null as GizmoManager | null,
  render: null as (() => void) | null,
}));

// Real Babylon geometry, loaders and ray picking; only replace the GPU/window adapter.
vi.mock("@babylonjs/core", async (original) => {
  const actual = await original<typeof import("@babylonjs/core")>();
  return {
    ...actual,
    Engine: class extends actual.NullEngine {
      constructor() {
        super({
          renderWidth: 800,
          renderHeight: 600,
          textureSize: 128,
          deterministicLockstep: false,
          lockstepMaxSteps: 4,
        });
        runtime.engine = this;
      }
      override runRenderLoop(callback: () => void) {
        runtime.render = callback;
      }
    },
    GizmoManager: class extends actual.GizmoManager {
      constructor(scene: InstanceType<typeof actual.Scene>) {
        super(scene);
        runtime.gizmos = this;
      }
    },
    LoadAssetContainerAsync: async (source: File, scene: InstanceType<typeof actual.Scene>) =>
      actual.LoadAssetContainerAsync(new Uint8Array(await source.arrayBuffer()), scene, {
        pluginExtension: ".glb",
      }),
  };
});

import { startMapEditor, type MapEditorHandle } from "./start-map-editor";

const object = (id: string, y = 0): Extract<MapObject, { color: string }> => ({
  id,
  name: id,
  kind: "box",
  color: "#c7a681",
  visible: true,
  locked: false,
  position: { x: 0, y, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 1, z: 2 },
});

/** A tiny, embedded GLB triangle: no network or user assets needed. */
function triangleGlb(): File {
  const positions = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]);
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: positions.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [2, 2, 0] },
    ],
  });
  const jsonBytes = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, " "));
  const buffer = new ArrayBuffer(12 + 8 + jsonBytes.byteLength + 8 + positions.byteLength);
  const header = new DataView(buffer);
  header.setUint32(0, 0x46546c67, true);
  header.setUint32(4, 2, true);
  header.setUint32(8, buffer.byteLength, true);
  header.setUint32(12, jsonBytes.byteLength, true);
  header.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, jsonBytes.byteLength).set(jsonBytes);
  const bin = 20 + jsonBytes.byteLength;
  header.setUint32(bin, positions.byteLength, true);
  header.setUint32(bin + 4, 0x004e4942, true);
  new Uint8Array(buffer, bin + 8).set(new Uint8Array(positions.buffer));
  return new File([buffer], "triangle.glb", { type: "model/gltf-binary" });
}

describe("3D editor runtime", () => {
  let editor: MapEditorHandle;
  const onTransform = vi.fn();
  const onModelStatus = vi.fn();
  const onGridStepChange = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("window", {
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    onTransform.mockReset();
    onModelStatus.mockReset();
    onGridStepChange.mockReset();
    const canvas = { addEventListener() {}, removeEventListener() {} } as unknown as HTMLCanvasElement;
    editor = startMapEditor(canvas, { onSelect: vi.fn(), onTransform, onModelStatus, onGridStepChange });
  });
  afterEach(() => {
    editor?.dispose();
    vi.unstubAllGlobals();
  });

  it("applies JSON transforms, updates the same mesh and cleans up deleted objects", () => {
    const scene = runtime.engine!.scenes[0];
    editor.setLayout({ ...emptyMap(), objects: [object("table", 2)] });
    const root = scene.getTransformNodeByName("table")!;
    expect(root.position.y).toBe(2);
    editor.setLayout({
      ...emptyMap(),
      objects: [{ ...object("table", 4), rotation: { x: 0, y: 90, z: 0 } }],
    });
    expect(scene.getTransformNodeByName("table")).toBe(root);
    expect(root.position.y).toBe(4);
    expect(root.rotationQuaternion!.toEulerAngles().y).toBeCloseTo(Math.PI / 2);
    editor.setLayout(emptyMap());
    expect(scene.getTransformNodeByName("table")).toBeNull();
  });

  it("builds a low-poly prefab as ONE pickable mesh and rebuilds it when its colour changes", () => {
    const scene = runtime.engine!.scenes[0];
    const tree = {
      ...object("tree-1"),
      kind: "prefab" as const,
      prefab: "tree" as const,
      color: "#4fae45",
    };
    editor.setLayout({ ...emptyMap(), objects: [tree] });
    const root = scene.getTransformNodeByName("tree-1")!;
    const meshes = root.getChildMeshes();
    expect(meshes).toHaveLength(1);
    expect(meshes[0].isPickable).toBe(true);
    expect(meshes[0].metadata).toEqual({ editorId: "tree-1" });
    expect(onModelStatus).toHaveBeenCalledWith("tree-1", "ready");
    editor.setLayout({ ...emptyMap(), objects: [{ ...tree, color: "#ff0000" }] });
    expect(scene.getTransformNodeByName("tree-1")!.getChildMeshes()).toHaveLength(1);
    expect(scene.getTransformNodeByName("tree-1")).not.toBe(root);
  });

  it("place mode detaches the gizmo so clicks place instead of manipulating", () => {
    editor.setPlacing({ brush: false, spacing: 2 });
    expect(runtime.gizmos!.attachedNode).toBeNull();
    editor.setPlacing(null);
  });

  it("drops an elevated object onto another object instead of through it to the ground", () => {
    editor.setLayout({ ...emptyMap(), objects: [object("table"), object("pot", 5)] });
    runtime.engine!.scenes[0].render();
    editor.select("pot");
    editor.dropToSurface();
    expect(onTransform).toHaveBeenCalledWith(
      "pot",
      expect.objectContaining({ position: { x: 0, y: 1, z: 0 } }),
    );
  });

  it("attaches the chosen gizmo, uses independent snap sizes, and protects locked/hidden objects", () => {
    editor.setLayout({ ...emptyMap(), objects: [object("box")] });
    editor.select("box");
    editor.setTool("rotate", true);
    expect(runtime.gizmos!.attachedNode?.name).toBe("box");
    expect(runtime.gizmos!.rotationGizmoEnabled).toBe(true);
    expect(runtime.gizmos!.gizmos.rotationGizmo!.snapDistance).toBeCloseTo(Math.PI / 12);
    editor.setLayout({ ...emptyMap(), objects: [{ ...object("box"), locked: true }] });
    expect(runtime.gizmos!.attachedNode).toBeNull();
    editor.dropToSurface();
    expect(onTransform).not.toHaveBeenCalled();
    editor.setLayout({ ...emptyMap(), objects: [{ ...object("box"), visible: false }] });
    expect(runtime.engine!.scenes[0].getTransformNodeByName("box")!.isEnabled()).toBe(false);
  });

  it("loads real GLB geometry, resolves missing models, and shares source assets between copies", async () => {
    const { color: _, ...base } = object("model");
    void _;
    const glb = { ...base, kind: "glb" as const, source: "/models/triangle.glb" };
    editor.setLayout({
      ...emptyMap(),
      objects: [glb, { ...glb, id: "copy", position: { x: 8, y: 3, z: 0 } }],
    });
    expect(onModelStatus).toHaveBeenCalledWith("model", "missing");
    editor.setModels(new Map([[glb.source, triangleGlb()]]));
    await vi.waitFor(() => expect(onModelStatus).toHaveBeenCalledWith("copy", "ready"));
    expect(onModelStatus).toHaveBeenCalledWith("model", "ready");
    const scene = runtime.engine!.scenes[0];
    const root = scene.getTransformNodeByName("copy")!;
    root.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    const bounds = root.getHierarchyBoundingVectors(true);
    expect(bounds.min.y).toBeCloseTo(3);
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(8);
    editor.setLayout({ ...emptyMap(), objects: [glb] });
    expect(scene.getTransformNodeByName("copy")).toBeNull();
    expect(
      scene
        .getTransformNodeByName("model")!
        .getChildMeshes()
        .some((mesh) => mesh.getTotalVertices() === 3),
    ).toBe(true);
  });

  it("keeps the same ground geometry when changing dimensions, zoom and grid visibility", () => {
    const scene = runtime.engine!.scenes[0];
    editor.setLayout(emptyMap());
    const ground = scene.getMeshByName("editor-ground")!;
    const material = ground.material as ShaderMaterial;
    const vertices = ground.getTotalVertices();
    const meshes = scene.meshes.length;
    editor.setLayout({ ...emptyMap(), ground: { width: 512, depth: 200, color: "#334455" } });
    editor.setGrid(false);
    expect(material.serialize().floats.gridVisible).toBe(0);
    expect(ground.isEnabled()).toBe(true);
    expect(ground.scaling.x).toBe(512);
    const camera = scene.activeCamera as ArcRotateCamera;
    camera.radius = 1000;
    scene.render();
    expect(material.serialize().floats.gridStep).toBeGreaterThan(1);
    expect(onGridStepChange).toHaveBeenCalledTimes(1);
    scene.render();
    expect(onGridStepChange).toHaveBeenCalledTimes(1);
    editor.setGrid(true);
    expect(material.serialize().floats.gridVisible).toBe(1);
    expect(scene.meshes.length).toBe(meshes);
    expect(scene.getMeshByName("editor-ground")).toBe(ground);
    expect(ground.getTotalVertices()).toBe(vertices);
  });

  it("frames visible content away from the origin and excludes hidden objects", () => {
    const scene = runtime.engine!.scenes[0];
    const camera = scene.activeCamera as ArcRotateCamera;
    editor.setLayout({
      ...emptyMap(),
      objects: [
        { ...object("left"), position: { x: 80, y: 0, z: 10 } },
        { ...object("right"), position: { x: 100, y: 0, z: 10 } },
        { ...object("hidden"), visible: false, position: { x: -1000, y: 0, z: 0 } },
      ],
    });
    editor.frameAll();
    expect(camera.target.x).toBeCloseTo(90);
    expect(camera.target.z).toBeCloseTo(10);
    expect(camera.radius).toBeLessThan(50);
    const allRadius = camera.radius;
    editor.select("right");
    editor.focus();
    expect(camera.target.x).toBeCloseTo(100);
    expect(camera.radius).toBeLessThan(allRadius);
    editor.overview(true);
    expect(camera.target.x).toBeCloseTo(0);
    expect(camera.beta).toBe(0.02);
    expect(camera.alpha).toBeCloseTo(-Math.PI / 2);
    editor.setLayout(emptyMap());
    editor.frameAll();
    expect(Number.isFinite(camera.radius)).toBe(true);
  });

  it("does not rebuild transforms or traverse unselected meshes for a name-only edit", () => {
    const scene = runtime.engine!.scenes[0];
    const original = { ...emptyMap(), objects: [object("selected"), object("unselected")] };
    editor.setLayout(original);
    editor.select("selected");
    const root = scene.getTransformNodeByName("unselected")!;
    const rotation = root.rotationQuaternion;
    const childScan = vi.spyOn(root, "getChildMeshes");
    const attachment = vi.spyOn(runtime.gizmos!, "attachToNode");
    editor.setLayout({
      ...original,
      objects: original.objects.map((item) => ({ ...item, name: "Renamed" })),
    });
    expect(root.rotationQuaternion).toBe(rotation);
    expect(childScan).not.toHaveBeenCalled();
    expect(attachment).not.toHaveBeenCalled();
    childScan.mockRestore();
    attachment.mockRestore();
  });

  it("clears the previous selection outline without changing other meshes", () => {
    const scene = runtime.engine!.scenes[0];
    editor.setLayout({ ...emptyMap(), objects: [object("first"), object("second")] });
    editor.select("first");
    const first = scene.getTransformNodeByName("first")!.getChildMeshes()[0];
    const second = scene.getTransformNodeByName("second")!.getChildMeshes()[0];
    expect(first.showBoundingBox).toBe(true);
    editor.select("second");
    expect(first.showBoundingBox).toBe(false);
    expect(second.showBoundingBox).toBe(true);
    editor.select(null);
    expect(second.showBoundingBox).toBe(false);
  });

  it("skips rendering while the browser tab is hidden and resumes on return", () => {
    const render = vi.spyOn(runtime.engine!.scenes[0], "render");
    const documentStub = { hidden: true, addEventListener() {}, removeEventListener() {} };
    vi.stubGlobal("document", documentStub);
    runtime.render!();
    expect(render).not.toHaveBeenCalled();
    documentStub.hidden = false;
    runtime.render!();
    expect(render).toHaveBeenCalledOnce();
  });
});
