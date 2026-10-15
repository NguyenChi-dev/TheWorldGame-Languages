import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { CharacterAppearance } from "@lw/shared";
import { fitCameraToScreen } from "./scene/environment";
import { CharacterModel, turnTowards } from "./scene/character";

export interface CharacterPreviewOptions {
  initial: CharacterAppearance;
  maxPixelRatio?: number;
}

export interface CharacterPreviewHandle {
  /** Mặc lại đồ cho nhân vật (dựng lại mô hình, nhân vật nảy lên và vẫy tay). */
  setAppearance: (appearance: CharacterAppearance) => void;
  dispose: () => void;
}

/** Góc camera nhìn thẳng mặt nhân vật. */
const FRONT = -Math.PI / 2;
/** Vẫy tay bao lâu sau mỗi lần thay đồ (giây). */
const WAVE_SECONDS = 1.6;

/**
 * Khung xem nhân vật ở màn chọn nhân vật: một nhân vật đứng trên hòn đảo low-poly nổi.
 * Kéo (chuột / ngón tay) để xoay xem quanh nhân vật; để yên thì camera tự xoay chậm.
 * Nền trong suốt để thấy cảnh thế giới phía sau.
 */
export function startCharacterPreview(
  canvas: HTMLCanvasElement,
  options: CharacterPreviewOptions,
): CharacterPreviewHandle {
  const maxPixelRatio = options.maxPixelRatio ?? 2;
  const engine = new Engine(
    canvas,
    true,
    { preserveDrawingBuffer: false, stencil: true, premultipliedAlpha: false },
    false,
  );
  const applyResolution = () => {
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    engine.resize();
  };
  applyResolution();

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.85;
  ambient.groundColor = new Color3(0.55, 0.5, 0.6);
  const sun = new DirectionalLight("sun", new Vector3(0.4, -1, 0.7), scene);
  sun.intensity = 0.7;

  // Camera xoay quanh nhân vật: chỉ cho xoay, không phóng to / kéo lệch.
  const camera = new ArcRotateCamera("camera", FRONT, 1.36, 6.6, new Vector3(0, 0.98, 0), scene);
  camera.fov = 0.6;
  camera.lowerBetaLimit = 1.1;
  camera.upperBetaLimit = 1.5;
  camera.lowerRadiusLimit = camera.radius;
  camera.upperRadiusLimit = camera.radius;
  camera.panningSensibility = 0;
  camera.angularSensibilityX = 600;
  camera.attachControl(true);
  // Camera tự xoay chậm quanh nhân vật khi người chơi để yên (sau khi kéo xoay: chờ 6 giây).
  const setAutoRotate = (on: boolean) => {
    camera.useAutoRotationBehavior = on;
    if (on && camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed = 0.25;
      camera.autoRotationBehavior.idleRotationWaitTime = 6000;
      camera.autoRotationBehavior.idleRotationSpinupTime = 2000;
    }
  };
  fitCameraToScreen(camera);
  engine.onResizeObservable.add(() => fitCameraToScreen(camera));

  createIsland(scene);

  // Vòng sáng dưới chân nhân vật.
  const halo = MeshBuilder.CreateTorus("halo", { diameter: 1.05, thickness: 0.07, tessellation: 24 }, scene);
  const haloMat = new StandardMaterial("halo-mat", scene);
  haloMat.emissiveColor = new Color3(1, 0.85, 0.35);
  haloMat.diffuseColor = Color3.Black();
  haloMat.alpha = 0.85;
  halo.material = haloMat;
  halo.isPickable = false;
  halo.position.y = 0.03;

  let model = new CharacterModel(scene, options.initial, "preview");
  let waveLeft = WAVE_SECONDS;
  let pop = 1;
  // Lúc mở và sau mỗi lần thay đồ: quay camera về nhìn thẳng mặt nhân vật, đứng yên một lúc
  // cho người chơi ngắm rồi mới tự xoay.
  const IDLE_BEFORE_SPIN = 6;
  let faceLeft = 0;
  let spinIn = IDLE_BEFORE_SPIN;

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    waveLeft = Math.max(0, waveLeft - dt);
    if (faceLeft > 0) {
      faceLeft -= dt;
      camera.alpha = turnTowards(camera.alpha, FRONT, dt * 6);
    }
    if (spinIn > 0) {
      spinIn -= dt;
      if (spinIn <= 0) setAutoRotate(true);
    }
    model.update(dt, { waving: waveLeft > 0 });
    // Nảy lên khi vừa thay đồ: từ nhỏ phóng to hơi lố rồi về đúng cỡ.
    pop = Math.min(1, pop + dt * 3);
    model.root.scaling.setAll(0.85 + 0.15 * pop + Math.sin(pop * Math.PI) * 0.1);
    halo.rotation.y += dt;
    halo.scaling.setAll(1 + Math.sin(performance.now() / 300) * 0.05);
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", applyResolution);
  const resizeObserver = new ResizeObserver(() => engine.resize());
  resizeObserver.observe(canvas);

  return {
    setAppearance: (appearance) => {
      const current = model.appearance;
      if (
        current.gender === appearance.gender &&
        current.hat === appearance.hat &&
        current.top === appearance.top &&
        current.bottom === appearance.bottom
      )
        return;
      model.dispose();
      model = new CharacterModel(scene, appearance, "preview");
      waveLeft = WAVE_SECONDS;
      pop = 0;
      faceLeft = 0.9;
      spinIn = IDLE_BEFORE_SPIN;
      setAutoRotate(false);
    },
    dispose: () => {
      window.removeEventListener("resize", applyResolution);
      resizeObserver.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}

/** Hòn đảo nổi low-poly: mặt cỏ, đáy đất nhọn, vài tảng đá và bụi hoa quanh mép. */
function createIsland(scene: Scene) {
  const flat = (color: string) => {
    const mat = new StandardMaterial(`island-${color}`, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.emissiveColor = Color3.FromHexString(color).scale(0.15);
    mat.specularColor = Color3.Black();
    return mat;
  };
  const part = (mesh: Mesh, color: string, position: [number, number, number]) => {
    mesh.convertToFlatShadedMesh();
    mesh.material = flat(color);
    mesh.position.set(...position);
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    return mesh;
  };

  const radius = 1.6;
  part(
    MeshBuilder.CreateCylinder("grass", { height: 0.2, diameter: radius * 2, tessellation: 10 }, scene),
    "#7cc35b",
    [0, -0.1, 0],
  );
  part(
    MeshBuilder.CreateCylinder(
      "grass-edge",
      { height: 0.12, diameterTop: radius * 2, diameterBottom: radius * 2 - 0.2, tessellation: 10 },
      scene,
    ),
    "#5fa548",
    [0, -0.26, 0],
  );
  part(
    MeshBuilder.CreateCylinder(
      "dirt",
      { height: 1.1, diameterTop: radius * 2 - 0.2, diameterBottom: 0.4, tessellation: 8 },
      scene,
    ),
    "#9a6a42",
    [0, -0.87, 0],
  );

  // Đá và bụi hoa trang trí trên mép đảo.
  const decor: [number, string, number][] = [
    [0.9, "#f6a6c1", 0.2],
    [2.0, "#a7a2a9", 0.17],
    [3.1, "#ffd36b", 0.18],
    [4.1, "#f6a6c1", 0.16],
    [5.3, "#a7a2a9", 0.2],
  ];
  for (const [angle, color, size] of decor) {
    const r = radius - 0.3;
    part(MeshBuilder.CreateIcoSphere("decor", { radius: size, subdivisions: 1, flat: true }, scene), color, [
      Math.sin(angle) * r,
      size * 0.5,
      -Math.cos(angle) * r,
    ]);
  }
}
