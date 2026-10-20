/** Ảnh minh họa (thumbnail) cho file GLB: dựng mô hình trong một canvas ẩn rồi chụp lại thành PNG. */
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  LoadAssetContainerAsync,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

interface Studio {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  canvas: HTMLCanvasElement;
}

let studio: Studio | null = null;
let queue: Promise<unknown> = Promise.resolve();
let idleTimer: ReturnType<typeof setTimeout> | undefined;

/** Một engine dùng chung cho mọi ảnh (trình duyệt giới hạn số WebGL context); tự giải phóng khi rảnh. */
function getStudio(size: number): Studio {
  if (!studio) {
    registerBuiltInLoaders();
    const canvas = document.createElement("canvas");
    const engine = new Engine(
      canvas,
      true,
      { preserveDrawingBuffer: true, alpha: true, stencil: false },
      false,
    );
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    const camera = new ArcRotateCamera(
      "thumb-camera",
      -Math.PI / 4 - Math.PI / 2,
      1.1,
      10,
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.01;
    const ambient = new HemisphericLight("thumb-ambient", new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.85;
    ambient.groundColor = new Color3(0.45, 0.48, 0.55);
    const sun = new DirectionalLight("thumb-sun", new Vector3(-0.4, -1, 0.7), scene);
    sun.intensity = 0.9;
    studio = { engine, scene, camera, canvas };
  }
  // Canvas không gắn vào trang nên không dùng engine.resize() (đọc clientWidth = 0).
  studio.engine.setSize(size, size);
  return studio;
}

function scheduleRelease() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    studio?.engine.dispose();
    studio = null;
  }, 15000);
}

async function render(file: File, size: number): Promise<Blob | null> {
  const { scene, camera, canvas, engine } = getStudio(size);
  const container = await LoadAssetContainerAsync(file, scene, { pluginExtension: ".glb" });
  try {
    container.addAllToScene();
    for (const group of container.animationGroups) group.stop();
    const meshes = container.meshes.filter((mesh) => mesh.getTotalVertices() > 0);
    if (!meshes.length) return null;
    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of meshes) {
      const box = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, box.minimumWorld);
      max = Vector3.Maximize(max, box.maximumWorld);
    }
    const center = min.add(max).scale(0.5);
    const radius = Math.max(max.subtract(min).length() / 2, 0.001);
    camera.target = center;
    // Khoảng cách để hình cầu bao trọn mô hình vừa khung (fov dọc mặc định 0,8 rad), chừa lề 10%.
    camera.radius = (radius / Math.sin(camera.fov / 2)) * 1.1;
    camera.minZ = camera.radius / 1000;
    camera.maxZ = camera.radius * 10;
    await scene.whenReadyAsync();
    scene.render();
    scene.render();
    engine.flushFramebuffer();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    container.removeAllFromScene();
    container.dispose();
  }
}

/**
 * Chụp ảnh minh họa của một file GLB (nền trong suốt, góc nhìn 3/4 từ trên xuống).
 * Các yêu cầu chạy lần lượt trên một engine dùng chung. Trả về null nếu file không có mesh.
 */
export function renderModelThumbnail(file: File, size = 256): Promise<Blob | null> {
  const job = queue.then(() => render(file, size));
  queue = job.catch(() => null).finally(scheduleRelease);
  return job;
}
