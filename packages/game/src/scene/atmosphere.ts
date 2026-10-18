import {
  ArcRotateCamera,
  ColorCurves,
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  ImageProcessingConfiguration,
  Layer,
  Scene,
  ShadowGenerator,
  Vector3,
  type AbstractMesh,
} from "@babylonjs/core";

export type GraphicsQuality = "high" | "low";

/** Hướng nắng: từ phía bắc hơi chếch tây chiếu xuống, bóng đổ về phía camera (phía nam) cho dễ thấy. */
const SUN_DIRECTION = new Vector3(0.35, -1, -0.55).normalize();
/** Nửa cạnh vùng có bóng đổ quanh nhân vật (đơn vị bản đồ). */
const SHADOW_HALF_SIZE = 46;

/** Mesh không đổ bóng (mặt đất, nước, chữ, hiệu ứng...). */
const NO_CAST =
  /^(map-(ground|paths|sea|water|bridges|dock|place-square|place-market)|grass|sign|name-tag|click-|hit-|particle|sky|cloud|halo)/;

export interface Atmosphere {
  /** Thêm mesh vào danh sách đổ bóng (nhân vật, vật thể mới tạo). */
  castShadow: (mesh: AbstractMesh) => void;
  /**
   * Giảm hiệu ứng khi máy vẽ chậm: 1 = bỏ bloom, bóng mềm thấp; 2 = tắt hẳn bóng đổ.
   * Gọi lại với mức cao hơn để giảm tiếp.
   */
  degrade: (level: 1 | 2) => void;
}

/**
 * Không khí tự nhiên cho bản đồ:
 *   - bầu trời chuyển màu (đỉnh xanh đậm → chân trời sáng), sương mù nhẹ ở xa;
 *   - nắng ấm + ánh sáng bầu trời / mặt đất (cỏ hắt xanh lên), BÓNG ĐỔ THẬT bám theo nhân vật;
 *   - hậu kỳ màu: tone màu kiểu điện ảnh (ACES), tăng tương phản nhẹ, bloom cho đèn / nước,
 *     làm tối 4 góc (vignette), khử răng cưa.
 * `low` (điện thoại yếu): bóng đổ nhỏ hơn, bỏ bloom.
 */
export function createAtmosphere(
  scene: Scene,
  camera: ArcRotateCamera,
  lights: { ambient: HemisphericLight; sun: DirectionalLight },
  follow: () => { x: number; z: number },
  quality: GraphicsQuality,
): Atmosphere {
  // Bầu trời: lớp nền vẽ gradient (không tốn gì khi vẽ).
  const sky = new DynamicTexture("sky", { width: 4, height: 256 }, scene, false);
  const ctx = sky.getContext() as CanvasRenderingContext2D;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#5aa9e6");
  gradient.addColorStop(0.55, "#9fd4f5");
  gradient.addColorStop(1, "#e6f5ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  sky.update();
  const layer = new Layer("sky", null, scene, true);
  layer.texture = sky;
  scene.clearColor = new Color4(0.9, 0.96, 1, 1);

  // Sương mù xa: biển và rìa đảo nhạt dần vào chân trời.
  const horizon = Color3.FromHexString("#d9efff");
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = horizon;
  scene.fogStart = 85;
  scene.fogEnd = 230;

  // Ánh sáng: trời xanh nhạt, đất hắt màu cỏ, nắng vàng ấm.
  const { ambient, sun } = lights;
  ambient.intensity = 0.62;
  ambient.diffuse = Color3.FromHexString("#eaf4ff");
  ambient.groundColor = Color3.FromHexString("#7f9a5f");
  sun.direction = SUN_DIRECTION.clone();
  sun.intensity = 1.05;
  sun.diffuse = Color3.FromHexString("#fff0d2");

  // Bóng đổ: khung bóng (trực giao) đi theo nhân vật, bám lưới điểm ảnh để bóng không rung.
  sun.autoUpdateExtends = false;
  sun.autoCalcShadowZBounds = false;
  sun.orthoLeft = -SHADOW_HALF_SIZE;
  sun.orthoRight = SHADOW_HALF_SIZE;
  sun.orthoTop = SHADOW_HALF_SIZE;
  sun.orthoBottom = -SHADOW_HALF_SIZE;
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 160;
  const mapSize = quality === "high" ? 2048 : 1024;
  const shadows = new ShadowGenerator(mapSize, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality =
    quality === "high" ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_LOW;
  shadows.bias = 0.0006;
  shadows.normalBias = 0.02;
  shadows.darkness = 0.38;
  const texel = (SHADOW_HALF_SIZE * 2) / mapSize;
  scene.onBeforeRenderObservable.add(() => {
    const { x, z } = follow();
    const sx = Math.round(x / texel) * texel;
    const sz = Math.round(z / texel) * texel;
    sun.position.set(sx - SUN_DIRECTION.x * 80, -SUN_DIRECTION.y * 80, sz - SUN_DIRECTION.z * 80);
  });

  const castShadow = (mesh: AbstractMesh) => {
    mesh.receiveShadows = true;
    if (!NO_CAST.test(mesh.name)) shadows.addShadowCaster(mesh, false);
  };
  for (const mesh of scene.meshes) castShadow(mesh);
  scene.onNewMeshAddedObservable.add((mesh) => {
    // Đợi mesh dựng xong (tên, vật liệu) rồi mới quyết định.
    scene.onBeforeRenderObservable.addOnce(() => {
      if (!mesh.isDisposed()) castShadow(mesh);
    });
  });

  // Hậu kỳ màu.
  const pipeline = new DefaultRenderingPipeline("look", quality === "high", scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.samples = 1;
  pipeline.bloomEnabled = quality === "high";
  pipeline.bloomThreshold = 0.82;
  pipeline.bloomWeight = 0.25;
  pipeline.bloomKernel = 48;
  pipeline.bloomScale = 0.5;
  pipeline.imageProcessingEnabled = true;
  const image = pipeline.imageProcessing;
  image.toneMappingEnabled = true;
  image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure = 1.06;
  image.contrast = 1.18;
  // Tăng độ tươi màu (tone ACES làm màu hơi nhạt).
  image.colorCurvesEnabled = true;
  const curves = new ColorCurves();
  curves.globalSaturation = 28;
  image.colorCurves = curves;
  image.vignetteEnabled = true;
  image.vignetteWeight = 1.6;
  image.vignetteStretch = 0.4;
  image.vignetteColor = new Color4(0.12, 0.18, 0.28, 0);

  const degrade = (level: 1 | 2) => {
    pipeline.bloomEnabled = false;
    shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
    if (level >= 2) sun.shadowEnabled = false;
  };

  return { castShadow, degrade };
}
