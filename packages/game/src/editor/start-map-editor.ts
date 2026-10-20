/** Browser-only 3D editor. React and persistence belong to the host app. */
import {
  ArcRotateCamera,
  ArcRotateCameraPointersInput,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  GizmoManager,
  HemisphericLight,
  LoadAssetContainerAsync,
  MeshBuilder,
  PointerEventTypes,
  Quaternion,
  Ray,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  type AssetContainer,
  type InstantiatedEntries,
  type Mesh,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { SPAWN_ID, type MapLayout, type MapObject, type MapVector } from "@lw/shared/map-layout";
import { LowPolyKit } from "../maps/low-poly-kit";
import { buildPrefab } from "../maps/prefabs";
import { createEditorGround, gridStepForView } from "./editor-ground";

export type EditorTool = "move" | "rotate" | "scale";
export type ModelStatus = "loading" | "ready" | "missing" | "error";
export interface EditorOptions {
  onSelect: (id: string | null) => void;
  onTransform: (id: string, transform: Pick<MapObject, "position" | "rotation" | "scale">) => void;
  onModelStatus: (id: string, status: ModelStatus) => void;
  onGridStepChange?: (metres: number) => void;
  /** Đang ở chế độ đặt vật thể: người dùng bấm (hoặc rê cọ) xuống điểm này. */
  onPlace?: (point: MapVector) => void;
  /** Điểm trên mặt đất / bề mặt dưới con trỏ (null: con trỏ ra ngoài). Gọi tối đa ~20 lần / giây. */
  onPointerGround?: (point: MapVector | null) => void;
}

export interface PlacingOptions {
  /** Cọ rải: giữ chuột rê để đặt liên tục, mỗi vật cách nhau `spacing` mét. */
  brush: boolean;
  spacing: number;
}
export interface MapEditorHandle {
  setLayout: (layout: MapLayout) => void;
  setModels: (models: ReadonlyMap<string, File>) => void;
  select: (id: string | null) => void;
  setTool: (tool: EditorTool, snap: boolean) => void;
  setGrid: (visible: boolean) => void;
  focus: () => void;
  frameAll: () => void;
  overview: (top?: boolean) => void;
  dropToSurface: () => void;
  /** Bật / tắt chế độ đặt vật thể (bấm xuống bản đồ để đặt). null: tắt. */
  setPlacing: (options: PlacingOptions | null) => void;
  dispose: () => void;
}

interface Entry {
  root: TransformNode;
  object: MapObject;
  file?: File;
  material?: StandardMaterial;
  instance?: InstantiatedEntries;
}
const RAD = Math.PI / 180;
const vector = (value: MapVector) => new Vector3(value.x, value.y, value.z);
const sameVector = (a: MapVector, b: MapVector) => a.x === b.x && a.y === b.y && a.z === b.z;
const plain = (value: Vector3, scale = 1): MapVector => ({
  x: +Math.max(-10000, Math.min(10000, value.x * scale)).toFixed(4),
  y: +Math.max(-10000, Math.min(10000, value.y * scale)).toFixed(4),
  z: +Math.max(-10000, Math.min(10000, value.z * scale)).toFixed(4),
});

export function startMapEditor(canvas: HTMLCanvasElement, options: EditorOptions): MapEditorHandle {
  registerBuiltInLoaders();
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, false);
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#18232fff");
  const camera = new ArcRotateCamera("editor-camera", -Math.PI / 3, 0.95, 38, Vector3.Zero(), scene);
  camera.minZ = 0.05;
  camera.maxZ = 20000;
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 1500;
  camera.lowerBetaLimit = 0.02;
  camera.upperBetaLimit = Math.PI / 2 - 0.01;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 60;
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  // Left click selects/manipulates, right drag orbits, Ctrl+right drag pans. Touch still orbits.
  const pointerInput = camera.inputs.attached.pointers;
  if (pointerInput instanceof ArcRotateCameraPointersInput) pointerInput.buttons = [1, 2];
  const ambient = new HemisphericLight("editor-ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.7;
  ambient.groundColor = new Color3(0.4, 0.45, 0.55);
  const sun = new DirectionalLight("editor-sun", new Vector3(-0.5, -1, 0.6), scene);
  sun.intensity = 0.65;

  const groundView = createEditorGround(scene);
  const ground = groundView.mesh;
  let gridStep = 0;

  const spawn = new TransformNode("spawn", scene);
  const spawnMesh = MeshBuilder.CreateCylinder(
    "spawn-marker",
    { height: 0.08, diameter: 1.2, tessellation: 32 },
    scene,
  );
  spawnMesh.parent = spawn;
  spawnMesh.position.y = 0.07;
  spawnMesh.metadata = { editorId: SPAWN_ID };
  const spawnMaterial = new StandardMaterial("spawn-material", scene);
  spawnMaterial.diffuseColor = Color3.FromHexString("#4ee4bd");
  spawnMaterial.emissiveColor = Color3.FromHexString("#237b68");
  spawnMesh.material = spawnMaterial;
  const pole = MeshBuilder.CreateCylinder("spawn-pole", { height: 1.8, diameter: 0.05 }, scene);
  pole.parent = spawn;
  pole.position.y = 0.95;
  pole.material = spawnMaterial;
  pole.metadata = { editorId: SPAWN_ID };

  const gizmos = new GizmoManager(scene);
  gizmos.usePointerToAttachGizmos = false;
  gizmos.clearGizmoOnEmptyPointerEvent = false;
  // Instantiate all three once, so observers remain stable when switching tools.
  gizmos.positionGizmoEnabled = true;
  gizmos.rotationGizmoEnabled = true;
  gizmos.scaleGizmoEnabled = true;
  // Position/rotation use world axes; Babylon scaling must stay in the object's local axes.
  if (gizmos.gizmos.positionGizmo) gizmos.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  if (gizmos.gizmos.rotationGizmo) gizmos.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  let selectedId: string | null = null;
  let highlightedId: string | null = null;
  let tool: EditorTool = "move";
  let snapping = true;
  let disposed = false;
  let layout: MapLayout | null = null;
  let models: ReadonlyMap<string, File> = new Map();
  const entries = new Map<string, Entry>();
  const assets = new Map<File, Promise<AssetContainer>>();

  const selectedRoot = () => (selectedId === SPAWN_ID ? spawn : entries.get(selectedId ?? "")?.root);
  const readTransform = (root: TransformNode) => {
    const rotation = root.rotationQuaternion?.toEulerAngles() ?? root.rotation;
    return {
      position: plain(root.position),
      rotation: plain(rotation, 1 / RAD),
      scale: {
        x: Math.max(0.01, Math.min(1000, root.scaling.x)),
        y: Math.max(0.01, Math.min(1000, root.scaling.y)),
        z: Math.max(0.01, Math.min(1000, root.scaling.z)),
      },
    };
  };
  const notifyTransform = () => {
    const root = selectedRoot();
    if (root && selectedId) options.onTransform(selectedId, readTransform(root));
  };
  for (const gizmo of [gizmos.gizmos.positionGizmo, gizmos.gizmos.rotationGizmo, gizmos.gizmos.scaleGizmo]) {
    gizmo?.onDragEndObservable.add(notifyTransform);
  }

  const attach = () => {
    const entry = entries.get(selectedId ?? "");
    const editable = selectedId === SPAWN_ID || (entry && entry.object.visible && !entry.object.locked);
    const effectiveTool = selectedId === SPAWN_ID ? "move" : tool;
    if (gizmos.positionGizmoEnabled !== (effectiveTool === "move"))
      gizmos.positionGizmoEnabled = effectiveTool === "move";
    if (gizmos.rotationGizmoEnabled !== (effectiveTool === "rotate"))
      gizmos.rotationGizmoEnabled = effectiveTool === "rotate";
    if (gizmos.scaleGizmoEnabled !== (effectiveTool === "scale"))
      gizmos.scaleGizmoEnabled = effectiveTool === "scale";
    if (gizmos.gizmos.positionGizmo) gizmos.gizmos.positionGizmo.snapDistance = snapping ? 0.5 : 0;
    if (gizmos.gizmos.rotationGizmo) gizmos.gizmos.rotationGizmo.snapDistance = snapping ? 15 * RAD : 0;
    if (gizmos.gizmos.scaleGizmo) gizmos.gizmos.scaleGizmo.snapDistance = snapping ? 0.1 : 0;
    const target = editable && !placing ? (selectedRoot() ?? null) : null;
    if (gizmos.attachedNode !== target) gizmos.attachToNode(target);
    // Only touch the old/current selection, not every mesh in a large imported scene.
    if (highlightedId !== selectedId) {
      for (const mesh of entries.get(highlightedId ?? "")?.root.getChildMeshes() ?? [])
        mesh.showBoundingBox = false;
    }
    for (const mesh of entry?.root.getChildMeshes() ?? []) mesh.showBoundingBox = true;
    highlightedId = selectedId;
  };

  const remove = (id: string) => {
    const entry = entries.get(id);
    if (!entry) return;
    if (selectedId === id) gizmos.attachToNode(null);
    entry.instance?.dispose();
    entry.root.dispose();
    entry.material?.dispose();
    entries.delete(id);
  };
  const material = (name: string, color: string) => {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = Color3.FromHexString(color);
    result.specularColor = Color3.Black();
    return result;
  };
  const apply = (entry: Entry, object: MapObject) => {
    const previous = entry.object;
    entry.object = object;
    // Validation clones JSON objects. Compare values so unrelated edits don't dirty every world matrix.
    if (!sameVector(entry.root.position, object.position))
      entry.root.position.copyFrom(vector(object.position));
    if (!entry.root.rotationQuaternion || !sameVector(previous.rotation, object.rotation))
      entry.root.rotationQuaternion = Quaternion.FromEulerAngles(
        object.rotation.x * RAD,
        object.rotation.y * RAD,
        object.rotation.z * RAD,
      );
    if (!sameVector(entry.root.scaling, object.scale)) entry.root.scaling.copyFrom(vector(object.scale));
    if (entry.root.isEnabled() !== object.visible) entry.root.setEnabled(object.visible);
    if (
      entry.material &&
      object.kind !== "glb" &&
      (previous.kind === "glb" || previous.color !== object.color)
    )
      entry.material.diffuseColor = Color3.FromHexString(object.color);
  };

  const loadGlb = async (entry: Entry, file: File, placeholder: Mesh) => {
    options.onModelStatus(entry.object.id, "loading");
    try {
      let asset = assets.get(file);
      if (!asset) {
        asset = LoadAssetContainerAsync(file, scene, { pluginExtension: ".glb" });
        assets.set(file, asset);
        void asset.then(
          (container) => {
            if (disposed) container.dispose();
          },
          () => {},
        );
      }
      const container = await asset;
      if (disposed || entries.get(entry.object.id) !== entry) return;
      const instance = container.instantiateModelsToScene((name) => `${entry.object.id}:${name}`, false, {
        doNotInstantiate: true,
      });
      entry.instance = instance;
      for (const animation of instance.animationGroups) animation.stop();
      // Normalize once, before parenting under the object's transform: origin = bottom centre.
      const content = new TransformNode("model-content", scene);
      for (const node of instance.rootNodes) node.parent = content;
      const meshes = content.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
      if (!meshes.length) {
        content.dispose();
        throw new Error("GLB không có mesh");
      }
      for (const mesh of meshes) mesh.computeWorldMatrix(true);
      const bounds = content.getHierarchyBoundingVectors(true);
      content.position.set(
        -(bounds.min.x + bounds.max.x) / 2,
        -bounds.min.y,
        -(bounds.min.z + bounds.max.z) / 2,
      );
      content.parent = entry.root;
      for (const mesh of meshes) {
        mesh.isPickable = true;
        mesh.metadata = { editorId: entry.object.id };
      }
      placeholder.dispose();
      entry.material?.dispose();
      entry.material = undefined;
      attach();
      options.onModelStatus(entry.object.id, "ready");
    } catch (error) {
      if (disposed || entries.get(entry.object.id) !== entry) return;
      console.warn("[map-editor] Không mở được GLB", error);
      options.onModelStatus(entry.object.id, "error");
    }
  };

  /** Mẫu low-poly: dựng các khối rồi gộp thành một mesh để chọn / kéo như một vật thể. */
  const buildPrefabMesh = (entry: Entry, object: Extract<MapObject, { kind: "prefab" }>) => {
    const kit = new LowPolyKit(scene);
    kit.useGroup(object.id);
    const holder = new TransformNode("prefab-holder", scene);
    buildPrefab(kit, object.prefab, object.color, holder);
    const mesh = kit.mergeGroup(object.id);
    holder.dispose();
    if (!mesh) return;
    mesh.parent = entry.root;
    mesh.isPickable = true;
    mesh.metadata = { editorId: object.id };
  };

  const build = (object: MapObject) => {
    const root = new TransformNode(object.id, scene);
    const entry: Entry = {
      root,
      object,
      file: object.kind === "glb" ? models.get(object.source) : undefined,
    };
    entries.set(object.id, entry);
    if (object.kind === "prefab") {
      buildPrefabMesh(entry, object);
      apply(entry, object);
      options.onModelStatus(object.id, "ready");
      return;
    }
    let mesh: Mesh;
    if (object.kind === "sphere")
      mesh = MeshBuilder.CreateSphere(object.id, { diameter: 1, segments: 16 }, scene);
    else if (object.kind === "cylinder")
      mesh = MeshBuilder.CreateCylinder(object.id, { height: 1, diameter: 1, tessellation: 24 }, scene);
    else mesh = MeshBuilder.CreateBox(object.id, { size: 1 }, scene);
    mesh.parent = root;
    mesh.position.y = 0.5;
    mesh.metadata = { editorId: object.id };
    entry.material = material(object.id, object.kind === "glb" ? "#f0a1ca" : object.color);
    entry.material.wireframe = object.kind === "glb";
    mesh.material = entry.material;
    apply(entry, object);
    if (object.kind === "glb") {
      if (entry.file) void loadGlb(entry, entry.file, mesh);
      else options.onModelStatus(object.id, "missing");
    } else options.onModelStatus(object.id, "ready");
  };

  const setLayout = (next: MapLayout) => {
    const previous = layout;
    layout = next;
    if (previous?.ground.width !== next.ground.width || previous?.ground.depth !== next.ground.depth)
      ground.scaling.set(next.ground.width, 1, next.ground.depth);
    if (previous?.ground.color !== next.ground.color) groundView.setColor(next.ground.color);
    if (!sameVector(spawn.position, next.spawn)) spawn.position.copyFrom(vector(next.spawn));
    const wanted = new Set(next.objects.map((object) => object.id));
    for (const id of entries.keys()) if (!wanted.has(id)) remove(id);
    for (const object of next.objects) {
      let entry = entries.get(object.id);
      if (
        entry &&
        (entry.object.kind !== object.kind ||
          (object.kind === "prefab" &&
            entry.object.kind === "prefab" &&
            (entry.object.prefab !== object.prefab || entry.object.color !== object.color)) ||
          (object.kind === "glb" &&
            (entry.object.kind !== "glb" ||
              entry.object.source !== object.source ||
              entry.file !== models.get(object.source))))
      ) {
        remove(object.id);
        entry = undefined;
      }
      if (entry) apply(entry, object);
      else build(object);
    }
    attach();
  };

  const frameBounds = (min: Vector3, max: Vector3) => {
    if (![...min.asArray(), ...max.asArray()].every(Number.isFinite)) return;
    camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
    camera.inertialPanningX = camera.inertialPanningY = 0;
    // Preserve the chosen orbit; default setTarget recomputes it from the previous camera position.
    camera.setTarget(min.add(max).scale(0.5), false, true, true);
    const halfFov = Math.min(
      camera.fov / 2,
      Math.atan(Math.tan(camera.fov / 2) * engine.getAspectRatio(camera)),
    );
    const radius = max.subtract(min).length() / 2;
    camera.radius = Math.max(
      4,
      Math.min(camera.upperRadiusLimit ?? 1500, (radius / Math.sin(halfFov)) * 1.2),
    );
  };
  const boundsFor = (root: TransformNode) => {
    for (const mesh of root.getChildMeshes()) mesh.computeWorldMatrix(true);
    return root.getHierarchyBoundingVectors(true);
  };
  const focus = () => {
    const root = selectedRoot();
    if (!root) return;
    const bounds = boundsFor(root);
    frameBounds(bounds.min, bounds.max);
  };

  scene.onPointerObservable.add((info) => {
    if (
      (info.type !== PointerEventTypes.POINTERTAP && info.type !== PointerEventTypes.POINTERDOUBLETAP) ||
      info.event.button !== 0 ||
      placing ||
      gizmos.isHovered ||
      gizmos.isDragging
    )
      return;
    const mesh = info.pickInfo?.pickedMesh;
    const id = (mesh?.metadata as { editorId?: string } | null)?.editorId ?? null;
    options.onSelect(id);
    if (id && info.type === PointerEventTypes.POINTERDOUBLETAP) {
      selectedId = id;
      attach();
      focus();
    }
  });
  // ---------------------------------------------------------------------------
  // Chế độ đặt vật thể: vòng tròn xem trước theo con trỏ, bấm để đặt, giữ chuột rê để rải (cọ).
  // ---------------------------------------------------------------------------
  let placing: PlacingOptions | null = null;
  let brushDown = false;
  let lastPlaced: Vector3 | null = null;
  let lastPointerReport = 0;
  const ghostMaterial = new StandardMaterial("place-ghost", scene);
  ghostMaterial.disableLighting = true;
  ghostMaterial.emissiveColor = Color3.FromHexString("#7de3c1");
  ghostMaterial.alpha = 0.9;
  const ghost = new TransformNode("place-ghost", scene);
  const ghostRing = MeshBuilder.CreateTorus(
    "place-ghost-ring",
    { diameter: 1.4, thickness: 0.06, tessellation: 40 },
    scene,
  );
  const ghostPin = MeshBuilder.CreateCylinder("place-ghost-pin", { height: 1.6, diameter: 0.05 }, scene);
  for (const mesh of [ghostRing, ghostPin]) {
    mesh.parent = ghost;
    mesh.material = ghostMaterial;
    mesh.isPickable = false;
  }
  ghostRing.position.y = 0.06;
  ghostPin.position.y = 0.8;
  ghost.setEnabled(false);

  /** Điểm dưới con trỏ: mặt đất hoặc mặt trên vật thể (để đặt chồng lên). Có bám lưới thì làm tròn 0,5 m. */
  const pointerPoint = (): Vector3 | null => {
    const hit = scene.pick(
      scene.pointerX,
      scene.pointerY,
      (mesh) =>
        mesh.isEnabled() &&
        mesh.isVisible &&
        (mesh === ground || !!(mesh.metadata as { editorId?: string } | null)?.editorId) &&
        mesh !== spawnMesh &&
        mesh !== pole,
    );
    const point = hit?.pickedPoint;
    if (!point) return null;
    if (snapping) {
      point.x = Math.round(point.x * 2) / 2;
      point.z = Math.round(point.z * 2) / 2;
    }
    return point;
  };
  const place = (point: Vector3) => {
    lastPlaced = point.clone();
    options.onPlace?.(plain(point));
  };
  scene.onPointerObservable.add((info) => {
    const event = info.event as PointerEvent;
    if (info.type === PointerEventTypes.POINTERMOVE) {
      const now = performance.now();
      const point = placing || now - lastPointerReport > 50 ? pointerPoint() : null;
      if (now - lastPointerReport > 50) {
        lastPointerReport = now;
        options.onPointerGround?.(point ? plain(point) : null);
      }
      if (!placing) return;
      ghost.setEnabled(!!point);
      if (point) ghost.position.copyFrom(point);
      if (
        brushDown &&
        point &&
        placing.brush &&
        (!lastPlaced || Vector3.Distance(point, lastPlaced) >= placing.spacing)
      )
        place(point);
      return;
    }
    if (!placing) return;
    if (info.type === PointerEventTypes.POINTERDOWN && event.button === 0) {
      // Bắt đầu nét cọ kể cả khi bấm ngoài mặt đất: rê vào bản đồ sẽ rải tiếp.
      brushDown = true;
      const point = pointerPoint();
      if (!point) return;
      place(point);
    } else if (info.type === PointerEventTypes.POINTERUP && event.button === 0) {
      brushDown = false;
      lastPlaced = null;
    }
  });
  const onPointerOut = () => {
    ghost.setEnabled(false);
    brushDown = false;
    options.onPointerGround?.(null);
  };
  canvas.addEventListener("pointerleave", onPointerOut);

  const onContextMenu = (event: Event) => event.preventDefault();
  canvas.addEventListener("contextmenu", onContextMenu);
  const resize = () => engine.resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("resize", resize);
  scene.onBeforeRenderObservable.add(() => {
    const cssHeight = canvas.clientHeight || engine.getRenderHeight() * engine.getHardwareScalingLevel();
    const step = gridStepForView(camera.radius, camera.fov, cssHeight);
    if (step !== gridStep) {
      gridStep = step;
      groundView.setStep(step);
      options.onGridStepChange?.(step);
    }
  });
  engine.runRenderLoop(() => {
    if (typeof document === "undefined" || !document.hidden) scene.render();
  });
  attach();

  return {
    setLayout,
    setModels(next) {
      models = next;
      if (layout) setLayout(layout);
    },
    select(id) {
      selectedId = id;
      attach();
    },
    setTool(next, snap) {
      tool = next;
      snapping = snap;
      attach();
    },
    setGrid(visible) {
      groundView.setGrid(visible);
    },
    focus,
    frameAll() {
      let min: Vector3 | null = null;
      let max: Vector3 | null = null;
      for (const entry of entries.values()) {
        if (!entry.object.visible) continue;
        const bounds = boundsFor(entry.root);
        min = min ? Vector3.Minimize(min, bounds.min) : bounds.min;
        max = max ? Vector3.Maximize(max, bounds.max) : bounds.max;
      }
      if (min && max) frameBounds(min, max);
      else {
        const halfWidth = (layout?.ground.width ?? 48) / 2;
        const halfDepth = (layout?.ground.depth ?? 48) / 2;
        frameBounds(new Vector3(-halfWidth, 0, -halfDepth), new Vector3(halfWidth, 0, halfDepth));
      }
    },
    overview(top = false) {
      camera.alpha = top ? -Math.PI / 2 : -Math.PI / 3;
      camera.beta = top ? 0.02 : 0.95;
      const halfWidth = (layout?.ground.width ?? 48) / 2;
      const halfDepth = (layout?.ground.depth ?? 48) / 2;
      frameBounds(new Vector3(-halfWidth, 0, -halfDepth), new Vector3(halfWidth, 0, halfDepth));
    },
    setPlacing(next) {
      placing = next;
      brushDown = false;
      lastPlaced = null;
      ghostRing.scaling.setAll(next?.brush ? Math.max(1, next.spacing * 0.9) : 1);
      if (!next) ghost.setEnabled(false);
      // Đang đặt: ẩn gizmo để bấm không vướng.
      if (next) gizmos.attachToNode(null);
      else attach();
      if (canvas.style) canvas.style.cursor = next ? "crosshair" : "";
      scene.defaultCursor = next ? "crosshair" : "default";
    },
    dropToSurface() {
      const root = selectedRoot();
      if (!root || !selectedId || entries.get(selectedId)?.object.locked) return;
      for (const mesh of root.getChildMeshes()) mesh.computeWorldMatrix(true);
      const bounds = root.getHierarchyBoundingVectors(true);
      const bottom = selectedId === SPAWN_ID ? root.position.y : bounds.min.y;
      const ray = new Ray(
        new Vector3(root.position.x, bottom + 0.05, root.position.z),
        Vector3.Down(),
        20000,
      );
      const hit = scene.pickWithRay(
        ray,
        (mesh) =>
          mesh.isEnabled() &&
          mesh.isVisible &&
          mesh !== spawnMesh &&
          mesh !== pole &&
          !mesh.isDescendantOf(root) &&
          (mesh === ground || !!(mesh.metadata as { editorId?: string } | null)?.editorId),
      );
      const surface = hit?.pickedPoint?.y ?? 0;
      root.position.y += surface - bottom;
      notifyTransform();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerleave", onPointerOut);
      engine.stopRenderLoop();
      for (const id of entries.keys()) remove(id);
      gizmos.dispose();
      for (const asset of assets.values())
        void asset.then(
          (container) => container.dispose(),
          () => {},
        );
      scene.dispose();
      engine.dispose();
    },
  };
}

export { renderModelThumbnail } from "./model-thumbnail";
